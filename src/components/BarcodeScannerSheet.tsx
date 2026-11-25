import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Loader2,
  PlusCircle,
  ScanBarcode,
  Search,
  WifiOff,
  X,
} from 'lucide-react';
import type { FoodItem } from '../types/models';

export interface ScannedProductDraft {
  nombre: string;
  kcal?: number;
  proteinaG?: number;
  carbohidratosG?: number;
  grasasG?: number;
  codigoBarras: string;
}

interface BarcodeScannerSheetProps {
  open: boolean;
  existingFoods: FoodItem[];
  onClose: () => void;
  onFoundExistingFood: (food: FoodItem) => void;
  onProductResolved: (draft: ScannedProductDraft) => void;
}

interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

interface OpenFoodFactsResponse {
  status: number;
  product?: {
    product_name?: string;
    product_name_es?: string;
    brands?: string;
    nutriments?: {
      'energy-kcal_100g'?: number;
      'energy-kcal'?: number;
      'energy-kj_100g'?: number;
      energy_100g?: number;
      proteins_100g?: number;
      carbohydrates_100g?: number;
      fat_100g?: number;
    };
  };
}

export function BarcodeScannerSheet({
  open,
  existingFoods,
  onClose,
  onFoundExistingFood,
  onProductResolved,
}: BarcodeScannerSheetProps) {
  const [manualCode, setManualCode] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectedLockRef = useRef(false);

  function stopCamera() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }
    setManualCode('');
    setStatusMsg(null);
    setNotFoundCode(null);
    setErrorMsg(null);
    detectedLockRef.current = false;
    return () => {
      stopCamera();
    };
  }, [open]);

  function openManualCreateWithBarcode(code: string) {
    stopCamera();
    onProductResolved({
      nombre: '',
      codigoBarras: code,
    });
    onClose();
  }

  async function lookupBarcode(rawCode: string) {
    const code = rawCode.replace(/\D/g, '').trim();
    if (code.length < 6) {
      setErrorMsg('Ingresa un código de barras válido (mínimo 6 dígitos).');
      return;
    }

    stopCamera();
    setErrorMsg(null);
    setNotFoundCode(null);

    // 1. Revisar catálogo local offline primero
    const localMatch = existingFoods.find((f) => f.codigoBarras === code);
    if (localMatch) {
      onFoundExistingFood(localMatch);
      onClose();
      return;
    }

    // 2. Verificar conectividad antes de consultar Open Food Facts
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setNotFoundCode(code);
      setErrorMsg(
        'Estás sin conexión y este código aún no está en tu catálogo local.',
      );
      return;
    }

    setLoading(true);
    setStatusMsg(`Buscando código ${code} en Open Food Facts...`);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_es,brands,nutriments`,
        { signal: controller.signal },
      );

      // En la API v2 de Open Food Facts, un producto inexistente devuelve HTTP 404 con status: 0
      if (res.status === 404) {
        setNotFoundCode(code);
        setStatusMsg(null);
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as OpenFoodFactsResponse;

      if (data.status !== 1 || !data.product) {
        setNotFoundCode(code);
        setStatusMsg(null);
        return;
      }

      const p = data.product;
      const baseName = (p.product_name_es || p.product_name || '').trim();
      const brand = (p.brands || '').split(',')[0]?.trim();
      const fullName =
        baseName && brand && !baseName.toLowerCase().includes(brand.toLowerCase())
          ? `${baseName} (${brand})`
          : baseName || `Producto ${code}`;

      const nutr = p.nutriments ?? {};
      let kcalVal = Number(nutr['energy-kcal_100g'] ?? nutr['energy-kcal']);
      if (!Number.isFinite(kcalVal) || kcalVal <= 0) {
        const kjVal = Number(nutr['energy-kj_100g'] ?? nutr.energy_100g);
        if (Number.isFinite(kjVal) && kjVal > 0) {
          kcalVal = kjVal / 4.184;
        }
      }

      const kcal = Number.isFinite(kcalVal) && kcalVal > 0 ? Math.round(kcalVal) : 0;
      const proteinaG = Number((Number(nutr.proteins_100g ?? 0) || 0).toFixed(1));
      const carbohidratosG = Number(
        (Number(nutr.carbohydrates_100g ?? 0) || 0).toFixed(1),
      );
      const grasasG = Number((Number(nutr.fat_100g ?? 0) || 0).toFixed(1));

      onProductResolved({
        nombre: fullName,
        kcal,
        proteinaG,
        carbohidratosG,
        grasasG,
        codigoBarras: code,
      });
      onClose();
    } catch {
      setNotFoundCode(code);
      setErrorMsg(
        'No se pudo conectar con Open Food Facts (conexión lenta o sin señal). Puedes crear el alimento con este código ahora mismo.',
      );
      setStatusMsg(null);
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  async function startCameraScan() {
    setErrorMsg(null);
    setNotFoundCode(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('Este navegador no permite acceso a cámara. Usa el ingreso manual del código.');
      return;
    }
    if (!window.BarcodeDetector) {
      setErrorMsg(
        'Tu navegador no soporta detección nativa de códigos de barras. Escribe el número debajo para buscarlo.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      detectedLockRef.current = false;

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });

      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
      });

      const scanFrame = async () => {
        if (!streamRef.current || detectedLockRef.current) return;
        if (videoRef.current && videoRef.current.readyState >= 2) {
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              detectedLockRef.current = true;
              const code = barcodes[0].rawValue;
              setManualCode(code);
              await lookupBarcode(code);
              return;
            }
          } catch {
            // ignore single-frame decode error
          }
        }
        rafRef.current = requestAnimationFrame(() => {
          void scanFrame();
        });
      };

      rafRef.current = requestAnimationFrame(() => {
        void scanFrame();
      });
    } catch {
      setErrorMsg('No se pudo abrir la cámara. Revisa los permisos o escribe el código manualmente.');
      stopCamera();
    }
  }

  if (!open) return null;

  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        aria-hidden="true"
        onClick={() => {
          stopCamera();
          onClose();
        }}
        className="fixed inset-0 bg-surface/75 animate-fade-in"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="barcode-sheet-title"
        className="relative z-10 w-full max-w-[480px] bg-surface-container border-t border-x border-outline rounded-t-xl px-page-margin pt-gutter-md pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-gutter-lg animate-sheet-enter"
      >
        <div className="w-10 h-1 rounded-full bg-outline mx-auto" aria-hidden="true" />

        <header className="flex items-center justify-between gap-gutter-sm">
          <div className="flex items-center gap-gutter-sm">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-primary-container text-primary">
              <ScanBarcode className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="barcode-sheet-title" className="font-headline text-headline-md text-on-surface">
                Escanear código de barras
              </h2>
              <p className="font-body text-body-sm text-on-surface-variant">
                Catálogo local offline + Open Food Facts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            aria-label="Cerrar escáner"
            className="inline-flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </header>

        {isOffline && (
          <div className="flex items-center gap-gutter-sm p-gutter-md rounded-md bg-warning-container border border-warning text-on-warning-container">
            <WifiOff className="w-4 h-4 shrink-0 text-warning" aria-hidden="true" />
            <span className="font-body text-body-sm">
              Estás offline: solo se buscarán códigos que ya guardaste en tu catálogo local.
            </span>
          </div>
        )}

        {/* Visor de cámara */}
        {cameraActive ? (
          <div className="relative overflow-hidden rounded-lg border border-primary bg-surface aspect-[16/10]">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-primary/80" />
            <button
              type="button"
              onClick={stopCamera}
              className="absolute bottom-2 right-2 min-h-[36px] px-gutter-md rounded-md bg-surface/85 border border-outline font-label text-label-sm text-on-surface"
            >
              Detener cámara
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void startCameraScan()}
            className="w-full min-h-[52px] px-gutter-lg rounded-md bg-surface-container-high border border-outline text-on-surface font-label text-label-md inline-flex items-center justify-center gap-gutter-sm hover:border-primary hover:text-primary transition-colors"
          >
            <Camera className="w-5 h-5" aria-hidden="true" />
            <span>Activar cámara para escanear</span>
          </button>
        )}

        {/* Ingreso manual */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void lookupBarcode(manualCode);
          }}
          className="flex flex-col gap-gutter-sm"
        >
          <label htmlFor="manual-barcode" className="font-label text-label-sm text-on-surface-variant">
            O escribe el código EAN / UPC manualmente
          </label>
          <div className="flex items-center gap-gutter-sm">
            <input
              id="manual-barcode"
              type="text"
              inputMode="numeric"
              placeholder="Ej. 7802900001234"
              value={manualCode}
              onChange={(e) => {
                setManualCode(e.target.value);
                setErrorMsg(null);
                setNotFoundCode(null);
              }}
              className="flex-1 min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-mono text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={loading || manualCode.trim().length === 0}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 min-h-[44px] px-gutter-lg rounded-md bg-primary text-on-primary font-label text-label-md transition-colors hover:bg-on-primary-container disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="w-4 h-4" aria-hidden="true" />
              )}
              <span>Buscar</span>
            </button>
          </div>
        </form>

        {statusMsg && !errorMsg && !notFoundCode && (
          <p className="font-body text-body-sm text-secondary">{statusMsg}</p>
        )}

        {notFoundCode && (
          <div className="bg-warning-container/60 border border-warning rounded-md p-gutter-md flex flex-col gap-gutter-md">
            <p className="font-body text-body-sm text-on-warning-container text-pretty">
              {errorMsg ??
                `El código ${notFoundCode} aún no está en Open Food Facts. Puedes ingresarlo una vez desde su etiqueta y quedará guardado offline en Samsara.`}
            </p>
            <button
              type="button"
              onClick={() => openManualCreateWithBarcode(notFoundCode)}
              className="w-full min-h-[44px] px-gutter-md rounded-md bg-primary text-on-primary font-label text-label-md inline-flex items-center justify-center gap-gutter-sm hover:bg-on-primary-container transition-colors"
            >
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              <span>Crear alimento con este código</span>
            </button>
          </div>
        )}

        {errorMsg && !notFoundCode && (
          <p className="font-body text-body-sm text-error text-pretty" role="alert">
            {errorMsg}
          </p>
        )}
      </section>
    </div>
  );
}

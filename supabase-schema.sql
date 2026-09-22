-- KangooCumples — Supabase schema
-- Ejecutá este SQL en el SQL Editor de tu proyecto Supabase

-- ── Tabla de eventos ──
CREATE TABLE IF NOT EXISTS public.eventos (
  id          BIGSERIAL PRIMARY KEY,
  fecha       DATE,
  hora        TEXT,
  salon       TEXT,
  reservante  TEXT,
  telefono    TEXT,
  cumple      TEXT,
  edad        TEXT,
  tipo        TEXT,
  privado     BOOLEAN DEFAULT FALSE,
  chi         INTEGER DEFAULT 0,
  adu         INTEGER DEFAULT 0,
  obs         TEXT,
  pago        TEXT DEFAULT 'none',   -- 'none' | 'sena' | 'paid'
  monto       NUMERIC DEFAULT 0,
  met         TEXT,
  total       NUMERIC DEFAULT 0,
  promo_id    TEXT,
  interes     NUMERIC DEFAULT 0,
  interes_tipo TEXT DEFAULT 'pct',
  mrows                JSONB DEFAULT '[]',    -- [{mid, qty}]
  extras               JSONB DEFAULT '[]',    -- [{eid, qty}]
  consumos             JSONB DEFAULT '[]',    -- [{productoId, nombreProducto, qty, precioUnitario}]
  consumos_cobrados    BOOLEAN DEFAULT FALSE,
  menus_stock_aplicado BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Migraciones (si la tabla eventos ya existe):
-- ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS consumos JSONB DEFAULT '[]';
-- ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS consumos_cobrados BOOLEAN DEFAULT FALSE;
-- ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS menus_stock_aplicado BOOLEAN DEFAULT FALSE;
-- ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS articulos JSONB DEFAULT '[]';
-- ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS precio_chico NUMERIC;
-- ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS precio_adulto NUMERIC;
-- UPDATE public.eventos SET precio_chico = 28000, precio_adulto = 0 WHERE precio_chico IS NULL;
-- ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS interes NUMERIC DEFAULT 0;
-- ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS interes_tipo TEXT DEFAULT 'pct';

-- ── Tabla de configuración (clave→valor JSON) ──
CREATE TABLE IF NOT EXISTS public.configuracion (
  id          BIGSERIAL PRIMARY KEY,
  clave       TEXT UNIQUE NOT NULL,
  valor       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ── SISTEMA DE VENTAS ────────────────────────
-- ─────────────────────────────────────────────

-- Categorías de productos
CREATE TABLE IF NOT EXISTS public.categorias (
  id         BIGSERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Productos (simples y compuestos)
CREATE TABLE IF NOT EXISTS public.productos (
  id           BIGSERIAL PRIMARY KEY,
  codigo       TEXT,
  nombre       TEXT NOT NULL,
  categoria_id BIGINT REFERENCES public.categorias(id) ON DELETE SET NULL,
  tipo         TEXT DEFAULT 'simple',    -- 'simple' | 'compuesto'
  precio_venta NUMERIC DEFAULT 0,
  precio_costo NUMERIC DEFAULT 0,
  unidad       TEXT DEFAULT 'unidad',
  stock_actual NUMERIC DEFAULT 0,
  stock_minimo NUMERIC DEFAULT 0,
  activo       BOOLEAN DEFAULT TRUE,
  maneja_stock BOOLEAN DEFAULT TRUE,     -- FALSE = no descuenta ni controla stock (ej: servicios, entradas)
  componentes  JSONB DEFAULT '[]',       -- [{producto_id, nombre, cantidad}]
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Cajas (sesiones por sector/turno — pueden haber múltiples abiertas simultáneamente)
CREATE TABLE IF NOT EXISTS public.cajas (
  id             BIGSERIAL PRIMARY KEY,
  nombre         TEXT DEFAULT 'Caja',     -- Ej: 'Buffet', 'Saltos', 'Entrada'
  turno          TEXT,                    -- Ej: 'Mañana', 'Tarde', 'Noche'
  fecha          DATE DEFAULT CURRENT_DATE,
  hora_apertura  TEXT,
  hora_cierre    TEXT,
  saldo_inicial  NUMERIC DEFAULT 0,
  saldo_final    NUMERIC,
  total_ventas   NUMERIC DEFAULT 0,
  total_efectivo NUMERIC DEFAULT 0,
  estado         TEXT DEFAULT 'abierta',  -- 'abierta' | 'cerrada'
  obs_cierre     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Migración (si la tabla ya existe, ejecutar en Supabase SQL Editor):
-- ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS nombre TEXT DEFAULT 'Caja';
-- ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS turno TEXT;
-- ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS empleado_cierre TEXT;
-- ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS empleado_apertura TEXT;

-- Empleados
CREATE TABLE IF NOT EXISTS public.empleados (
  id         BIGSERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL,
  activo     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ventas (cabecera de ticket)
CREATE TABLE IF NOT EXISTS public.ventas (
  id           BIGSERIAL PRIMARY KEY,
  numero       TEXT,
  fecha        DATE DEFAULT CURRENT_DATE,
  hora         TEXT,
  cliente      TEXT,
  subtotal     NUMERIC DEFAULT 0,
  descuento    NUMERIC DEFAULT 0,
  total        NUMERIC DEFAULT 0,
  metodo_pago  TEXT,
  estado       TEXT DEFAULT 'completada',  -- 'completada' | 'anulada'
  caja_id      BIGINT REFERENCES public.cajas(id) ON DELETE SET NULL,
  empleado_id  BIGINT REFERENCES public.empleados(id) ON DELETE SET NULL,
  obs          TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
-- Migración: ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS empleado_id BIGINT REFERENCES public.empleados(id) ON DELETE SET NULL;
-- Migración: ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS maneja_stock BOOLEAN DEFAULT TRUE;

-- Items de venta
CREATE TABLE IF NOT EXISTS public.venta_items (
  id              BIGSERIAL PRIMARY KEY,
  venta_id        BIGINT REFERENCES public.ventas(id) ON DELETE CASCADE,
  producto_id     BIGINT REFERENCES public.productos(id) ON DELETE SET NULL,
  nombre_producto TEXT,
  precio_unitario NUMERIC,
  cantidad        NUMERIC,
  subtotal        NUMERIC,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Compras (remitos)
CREATE TABLE IF NOT EXISTS public.compras (
  id            BIGSERIAL PRIMARY KEY,
  fecha         DATE DEFAULT CURRENT_DATE,
  proveedor     TEXT,
  numero_remito TEXT,
  total         NUMERIC DEFAULT 0,
  metodo_pago   TEXT,
  obs           TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
-- Migración: ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS metodo_pago TEXT;
-- Migración: ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS iva NUMERIC DEFAULT 0;
-- Migración: ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS retenciones NUMERIC DEFAULT 0;
-- Migración: ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS impuestos NUMERIC DEFAULT 0;
-- Migración: ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS otros_gastos NUMERIC DEFAULT 0;

-- Items de compra
CREATE TABLE IF NOT EXISTS public.compra_items (
  id              BIGSERIAL PRIMARY KEY,
  compra_id       BIGINT REFERENCES public.compras(id) ON DELETE CASCADE,
  producto_id     BIGINT REFERENCES public.productos(id) ON DELETE SET NULL,
  nombre_producto TEXT,
  precio_unitario NUMERIC,
  cantidad        NUMERIC,
  subtotal        NUMERIC,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Usuarios del sistema
CREATE TABLE IF NOT EXISTS public.usuarios (
  id         BIGSERIAL PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  rol        TEXT NOT NULL DEFAULT 'pos',  -- 'admin' | 'pos'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all usuarios" ON public.usuarios FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Datos iniciales de usuarios
INSERT INTO public.usuarios (username, password, rol) VALUES
  ('kangaroo1', '123', 'admin'),
  ('kangaroo2', '123', 'pos')
ON CONFLICT (username) DO NOTHING;

-- Log de autorizaciones (registra qué clave autorizó cada acción sensible)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id           BIGSERIAL PRIMARY KEY,
  accion       TEXT NOT NULL,
  clave_nombre TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all audit_log" ON public.audit_log FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Proveedores
CREATE TABLE IF NOT EXISTS public.proveedores (
  id         BIGSERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL,
  cuit       TEXT,
  obs        TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all proveedores" ON public.proveedores FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ── Pedidos (menú digital) ──
CREATE TABLE IF NOT EXISTS public.pedidos (
  id         BIGSERIAL PRIMARY KEY,
  numero     INTEGER,
  nombre     TEXT,
  mesa       TEXT,
  notas      TEXT,
  total      NUMERIC DEFAULT 0,
  estado     TEXT DEFAULT 'pendiente',  -- pendiente | en_preparacion | listo | cobrado
  venta_id   BIGINT REFERENCES public.ventas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Secuencia para número legible de pedido
CREATE SEQUENCE IF NOT EXISTS public.pedidos_numero_seq START 1;

-- Asignar número automático en insert
CREATE OR REPLACE FUNCTION public.set_pedido_numero()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero IS NULL THEN
    NEW.numero := nextval('public.pedidos_numero_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pedido_numero ON public.pedidos;
CREATE TRIGGER trg_pedido_numero
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.set_pedido_numero();

-- Items de pedido
CREATE TABLE IF NOT EXISTS public.pedido_items (
  id              BIGSERIAL PRIMARY KEY,
  pedido_id       BIGINT REFERENCES public.pedidos(id) ON DELETE CASCADE,
  producto_id     BIGINT REFERENCES public.productos(id) ON DELETE SET NULL,
  nombre_producto TEXT,
  precio_unitario NUMERIC DEFAULT 0,
  cantidad        INTEGER DEFAULT 1,
  subtotal        NUMERIC DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Realtime para pedidos (necesario para Supabase Realtime)
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.pedido_items REPLICA IDENTITY FULL;

-- ── Row Level Security ──
ALTER TABLE public.eventos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cajas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compra_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empleados     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_items  ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso abierto
CREATE POLICY "allow all eventos"        ON public.eventos       FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow all configuracion"  ON public.configuracion FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow all categorias"     ON public.categorias    FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow all productos"      ON public.productos     FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow all cajas"          ON public.cajas         FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow all ventas"         ON public.ventas        FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow all venta_items"    ON public.venta_items   FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow all compras"        ON public.compras       FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow all compra_items"   ON public.compra_items  FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow all empleados"      ON public.empleados     FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow all pedidos"        ON public.pedidos       FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow all pedido_items"   ON public.pedido_items  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ── Datos iniciales ──
INSERT INTO public.configuracion (clave, valor) VALUES
  ('menus',   '[{"id":1,"n":"Menú Clásico","p":3500},{"id":2,"n":"Menú Vegano","p":4000},{"id":3,"n":"Menú Sin TACC","p":4200}]'),
  ('salones',  '["Salón Naranja","Salón Azul","Salón Verde"]'),
  ('promos',   '[{"id":1,"d":"Cumple entre semana -10%","pct":10},{"id":2,"d":"Grupo +20 chicos -15%","pct":15}]'),
  ('mets',     '["Efectivo","Transferencia","Tarjeta débito","Tarjeta crédito","Mercado Pago"]'),
  ('extras',   '[{"id":1,"n":"Bebidas","p":500},{"id":2,"n":"Medias","p":400},{"id":3,"n":"Hora extra","p":8000},{"id":4,"n":"Saltos adicionales","p":2000},{"id":5,"n":"Parque aéreo adicional","p":3000},{"id":6,"n":"Comida extra","p":1500}]'),
  ('pChico',   '5000'),
  ('pAdulto',  '2500')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO public.categorias (nombre) VALUES
  ('General'), ('Bebidas'), ('Alimentos'), ('Servicios'), ('Indumentaria')
ON CONFLICT DO NOTHING;

-- ── Asistencia de empleados ──
CREATE TABLE IF NOT EXISTS public.asistencias (
  id           BIGSERIAL PRIMARY KEY,
  empleado_id  BIGINT REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha        DATE NOT NULL,
  hora_entrada TEXT,
  hora_salida  TEXT,
  vacaciones   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (empleado_id, fecha)
);
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all asistencias" ON public.asistencias FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Observaciones mensuales por empleado
CREATE TABLE IF NOT EXISTS public.asistencia_obs (
  id          BIGSERIAL PRIMARY KEY,
  empleado_id BIGINT REFERENCES public.empleados(id) ON DELETE CASCADE,
  año         INTEGER NOT NULL,
  mes         INTEGER NOT NULL,
  obs         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (empleado_id, año, mes)
);
ALTER TABLE public.asistencia_obs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all asistencia_obs" ON public.asistencia_obs FOR ALL USING (TRUE) WITH CHECK (TRUE);

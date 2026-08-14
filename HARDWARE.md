# Hardware del sistema de control de acceso COBAO

Documento de referencia para comprar el hardware compatible con el sistema.
Todo el hardware funciona a **13.56 MHz (NFC)** y es compatible con el lector
base del proyecto: **ACS ACR122U** (protocolo PC/SC).

Las cantidades se calculan en función de:

- **A** = número de alumnos
- **P** = número de personal (docentes + administrativos)
- **N** = número de PC / puntos de acceso (entradas) donde se escaneará

---

## 1. Lector NFC (necesario por PC / punto de acceso)

| Lector | Cantidad | Notas |
|---|---|---|
| **ACS ACR122U** | **1 por cada punto de acceso (N) + 1 de respaldo por plantel** | **Recomendado.** El que usa el sistema. Compatible Windows/Linux. |
| ACS ACR1252U | Sustituto opcional del ACR122U (misma cantidad) | Más rápido, mejor alcance, lee ISO 14443A/B + FeliCa. |
| ACS ACR1222 | Sustituto opcional (misma cantidad) | Con teclado integrado opcional. |
| ACS ACR1222L | Sustituto opcional (misma cantidad) | Útil si se quiere PIN además de tarjeta. |
| HID OMNIKEY 5021 / 5022 CL | Sustituto opcional (misma cantidad) | Marca empresarial, muy robusto. |
| Lector USB genérico "PC/SC" de 13.56 MHz | Sustituto opcional (misma cantidad) | Puede funcionar, pero validar compatibilidad con `pcsc_scan` antes de comprar en volumen. |

> **Importante por punto de acceso:** el lector **no viaja por red**; debe estar
> enchufado por USB en la PC donde se valida la entrada (ve el README, sección
> "Instalacion del lector en una PC"). Si necesitas un punto con teclado/display
> independiente de la PC, el ACR1222L es la opción más económica.

---

## 2. Tarjetas NFC (credenciales para alumnos / personal)

El sistema solo almacena y compara el **UID** de la tarjeta. Sirven tarjetas
MIFARE, NTAG y de otros fabricantes mientras sean **ISO 14443A a 13.56 MHz**.

### 2.1 Tarjetas PVC tamaño credencial (CR80 - 85.6 x 54 mm)

Las más comunes: se pueden imprimir con foto y logo.

| Tipo | Cantidad | Uso recomendado |
|---|---|---|
| **MIFARE Classic 1K** | **A + P + 5% de respaldo** | **Recomendado.** Estándar, barata, UID leíble por el ACR122U. |
| MIFARE Classic 4K | A + P + 5% | Si a futuro se quieren guardar datos en la tarjeta. |
| NTAG213 | A + P + 5% | Barata, solo UID (suficiente para este sistema). |
| MIFARE DESFire EV2 | A + P + 5% | Seguridad superior, sobre-dimensionada para UID. |

### 2.2 Llaveros / monedas NFC

| Tipo | Cantidad | Notas |
|---|---|---|
| Llavero NFC MIFARE Classic 1K | **P (1 por personal de seguridad) + 10%** | Resistente, ideal para personal/seguridad. |
| Moneda / tag circular NFC | Opcional | Para llavero o bolsa. |

### 2.3 Pulseras NFC

| Tipo | Cantidad | Notas |
|---|---|---|
| Pulsera de silicona con chip MIFARE | Opcional (según uso) | Útil para eventos o control por grado/grupo. |

### 2.4 Etiquetas adhesivas (stickers) NFC

| Tipo | Cantidad | Notas |
|---|---|---|
| Sticker NTAG213 | 10% de respaldo | Pegar en credenciales de papel / gafetes existentes. |
| Sticker MIFARE Classic 1K | 10% de respaldo | Más compatibles con otros lectores. |

---

## 3. Extras recomendados

| Ítem | Cantidad | Notas |
|---|---|---|
| **Impresora de tarjetas PVC** (Zebra ZXP3, Fargo DTC4500e, Evolis Zenius) | 1 por plantel | Si se emiten credenciales con foto. |
| Cinta de impresión (ribbon) YMCKO | 2 por cada 200 tarjetas a imprimir | Consumible de la impresora. |
| Hub USB con alimentación | 1 por PC con 2 o más lectores | Si hay varios lectores por PC. |
| Extensión USB con blindaje | 1 por lector | El alcance del ACR122U es corto; mejor colocar el lector en un soporte fijo. |
| Soporte/estación para tarjeta | 1 por lector | Evita que el lector se caiga de la mesa. |

---

## 4. Regla de compra en resumen

1. **1 lector ACR122U por cada PC / punto de acceso** donde se escanee.
2. **1 tarjeta NFC por alumno y por empleado.** La **MIFARE Classic 1K** en
   formato CR80 es la opción más segura y económica.
3. **Una impresora de PVC** (opcional) solo si se van a emitir credenciales con
   foto impresa.
4. En compras grandes, pedir una **muestra** del lote de tarjetas y probar con
   `pcsc_scan` (Linux) o con `nfc_reader.py` (Windows) que el UID se lee antes
   de pagar todo el volumen.

> El UID se guarda en la base de datos con formato `AA:BB:CC:DD` y es único
> (`UNIQUE` en la tabla `credenciales`). Si compras tarjetas, verifica que cada
> lote traiga **UIDs únicos** (los fabricantes los garantizan).

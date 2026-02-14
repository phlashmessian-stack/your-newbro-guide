import math, struct, zlib
from pathlib import Path

# Simple PNG writer (RGBA, 8-bit)

def png_chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag)
    crc = zlib.crc32(data, crc) & 0xFFFFFFFF
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)


def write_png(path: Path, w: int, h: int, pixels: bytes) -> None:
    assert len(pixels) == w * h * 4
    raw = bytearray()
    stride = w * 4
    for y in range(h):
        raw.append(0)  # filter type 0
        raw += pixels[y * stride:(y + 1) * stride]

    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    data = b''.join([
        b'\x89PNG\r\n\x1a\n',
        png_chunk(b'IHDR', ihdr),
        png_chunk(b'IDAT', zlib.compress(bytes(raw), level=9)),
        png_chunk(b'IEND', b''),
    ])
    path.write_bytes(data)


def clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else 1.0 if x > 1.0 else x


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp3(c1, c2, c3, t):
    # t in [0,1], split at 0.5
    if t < 0.5:
        tt = t / 0.5
        return tuple(lerp(c1[i], c2[i], tt) for i in range(3))
    tt = (t - 0.5) / 0.5
    return tuple(lerp(c2[i], c3[i], tt) for i in range(3))


def draw():
    W = H = 256
    px = bytearray(W * H * 4)

    # Brand-ish gradient
    c_purple = (124, 58, 237)
    c_cyan = (34, 211, 238)
    c_pink = (236, 72, 153)

    # Background gradient + rounded corner mask
    radius = 56
    for y in range(H):
        for x in range(W):
            # diagonal blend
            t = (x + y) / (W + H - 2)
            r, g, b = lerp3(c_purple, c_cyan, c_pink, t)

            # rounded rect alpha mask
            dx = min(x, W - 1 - x)
            dy = min(y, H - 1 - y)
            a = 255
            if dx < radius and dy < radius:
                cx = radius - dx
                cy = radius - dy
                d = math.hypot(cx, cy)
                if d > radius:
                    # soft edge
                    a = int(255 * clamp01(1 - (d - radius) / 2.0))

            i = (y * W + x) * 4
            px[i + 0] = int(r)
            px[i + 1] = int(g)
            px[i + 2] = int(b)
            px[i + 3] = a

    def blend(x, y, sr, sg, sb, sa):
        if not (0 <= x < W and 0 <= y < H):
            return
        i = (y * W + x) * 4
        dr, dg, db, da = px[i], px[i + 1], px[i + 2], px[i + 3]
        a = sa / 255.0
        ia = 1.0 - a
        px[i] = int(sr * a + dr * ia)
        px[i + 1] = int(sg * a + dg * ia)
        px[i + 2] = int(sb * a + db * ia)
        px[i + 3] = int(sa + da * ia)

    def fill_round_rect(x0, y0, x1, y1, rr, color):
        r, g, b, a = color
        for y in range(y0, y1):
            for x in range(x0, x1):
                # corner distance
                ax = 0
                ay = 0
                if x < x0 + rr:
                    ax = x0 + rr - x
                elif x >= x1 - rr:
                    ax = x - (x1 - rr - 1)
                if y < y0 + rr:
                    ay = y0 + rr - y
                elif y >= y1 - rr:
                    ay = y - (y1 - rr - 1)
                if ax and ay and math.hypot(ax, ay) > rr:
                    continue
                blend(x, y, r, g, b, a)

    def fill_circle(cx, cy, rad, color):
        r, g, b, a = color
        r2 = rad * rad
        for y in range(cy - rad, cy + rad + 1):
            for x in range(cx - rad, cx + rad + 1):
                dx = x - cx
                dy = y - cy
                if dx * dx + dy * dy <= r2:
                    blend(x, y, r, g, b, a)

    # Add subtle dark overlay
    fill_round_rect(18, 18, W - 18, H - 18, 52, (16, 16, 24, 90))

    # Robot face card
    face_x0, face_y0, face_x1, face_y1 = 64, 72, 192, 200
    fill_round_rect(face_x0, face_y0, face_x1, face_y1, 28, (24, 24, 40, 220))
    fill_round_rect(face_x0 + 6, face_y0 + 6, face_x1 - 6, face_y1 - 6, 24, (12, 12, 22, 120))

    # Eyes
    fill_circle(104, 124, 18, (34, 211, 238, 255))
    fill_circle(152, 124, 18, (34, 211, 238, 255))
    fill_circle(104, 124, 8, (12, 12, 18, 255))
    fill_circle(152, 124, 8, (12, 12, 18, 255))

    # Mouth
    fill_round_rect(104, 152, 152, 168, 8, (224, 230, 240, 210))
    for x in range(112, 145, 8):
        fill_round_rect(x, 154, x + 3, 166, 2, (12, 12, 18, 200))

    # Antenna
    fill_round_rect(124, 44, 132, 78, 4, (224, 230, 240, 180))
    fill_circle(128, 42, 10, (236, 72, 153, 255))

    # Glow dots
    fill_circle(52, 212, 6, (124, 58, 237, 220))
    fill_circle(204, 212, 6, (34, 211, 238, 220))

    return W, H, bytes(px)


if __name__ == '__main__':
    w, h, pixels = draw()
    out = Path(__file__).resolve().parent.parent / 'public'
    out.mkdir(parents=True, exist_ok=True)
    write_png(out / 'favicon-256.png', w, h, pixels)
    print('wrote', out / 'favicon-256.png')

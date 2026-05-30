-- WRETVISION Horror Panel - 400x800 dithered pixel art
local W, H = 400, 800

local function c(r, g, b)
  return app.pixelColor.rgba(r, g, b, 255)
end

-- Palette
local BLACK   = c(0,   0,   0)
local VOID    = c(5,   0,   0)
local DRED1   = c(30,  2,   2)
local DRED2   = c(65,  5,   5)
local DRED3   = c(100, 12,  12)
local RED1    = c(140, 18,  18)
local RED2    = c(180, 25,  25)
local FIGDK1  = c(18,  15,  22)
local FIGDK2  = c(42,  38,  52)
local FIGMID  = c(78,  72,  92)
local FIGLT1  = c(115, 108, 132)
local FIGLT2  = c(152, 145, 170)
local FIGHI   = c(192, 186, 208)
local FIGWHI  = c(225, 220, 235)

-- 4x4 Bayer ordered dithering matrix
local BAY = {
  { 0, 8, 2,10},
  {12, 4,14, 6},
  { 3,11, 1, 9},
  {15, 7,13, 5}
}
local function bv(x, y) return BAY[(y%4)+1][(x%4)+1] / 16.0 end

-- Noise (sin-hash)
local function noise(x, y, s)
  local n = math.sin(x * 127.1 + y * 311.7 + (s or 0) * 74.3) * 43758.5453
  return n - math.floor(n)
end

local spr = Sprite(W, H, ColorMode.RGB)
local img = spr.cels[1].image

local function put(x, y, col)
  if x >= 0 and x < W and y >= 0 and y < H then
    img:putPixel(x, y, col)
  end
end

-- ── BACKGROUND ──────────────────────────────────────────────────────────────
-- Vertical gradient: black top → crimson center → black bottom, with dither
local bgPalette = {BLACK, VOID, DRED1, DRED2, DRED3, RED1, RED2}
for y = 0, H-1 do
  for x = 0, W-1 do
    local t  = y / (H - 1)          -- 0=top 1=bottom
    local b  = bv(x, y)
    -- radial darkening toward edges
    local ex = math.abs(x - W/2) / (W/2)
    local ey = math.abs(y - H/2) / (H/2)
    local edge = math.sqrt(ex*ex + ey*ey)
    -- pick gradient level
    local level
    if t < 0.12 then
      level = 1 + b * 0.5           -- near-black
    elseif t < 0.30 then
      local lt = (t - 0.12) / 0.18
      level = 1 + lt * 2.5 + b * 0.8
    elseif t < 0.55 then
      local lt = (t - 0.30) / 0.25
      level = 3.5 + lt * 2.0 + b * 1.0
    elseif t < 0.72 then
      local lt = (t - 0.55) / 0.17
      level = 5.5 - lt * 3.0 + b * 0.8
    else
      level = 2.5 - (t-0.72)/0.28 * 2.0 + b * 0.6
    end
    level = level - edge * 2.5     -- vignette darkening
    level = math.max(1, math.min(#bgPalette, math.floor(level + 0.5)))
    put(x, y, bgPalette[level])
  end
end

-- ── FIGURE ──────────────────────────────────────────────────────────────────
local CX     = W / 2
local HCY    = H * 0.395   -- head center y
local HRX    = 105          -- head x radius
local HRY    = 118          -- head y radius

-- Face + hood region
for y = 40, math.floor(H * 0.78) do
  for x = 15, W - 15 do
    local b   = bv(x, y)
    local nx  = noise(x, y, 1)
    local ny  = noise(x, y, 2)

    -- head ellipse with distortion
    local dx  = (x - CX) / HRX
    local dy  = (y - HCY) / HRY
    local distort = (noise(x * 2.3, y * 2.1, 3) - 0.5) * 0.30
    local hdist   = math.sqrt(dx*dx + dy*dy) + distort

    -- body/cloak below head
    local bdist = 9999
    if y > HCY then
      local spread = 1.0 + (y - HCY) / (H * 0.32)
      local bdx = (x - CX) / (HRX * spread * 1.25)
      local bdy = (y - HCY - HRY * 0.15) / (H * 0.36)
      bdist = math.sqrt(bdx*bdx + bdy*bdy) + (noise(x*1.8, y*1.8, 4) - 0.5) * 0.22
    end

    local figDist = math.min(hdist, bdist)

    if figDist < 1.08 then
      -- ── Eyes (black hollow sockets) ─────────────────────────────────────
      local eyeY  = HCY - HRY * 0.07
      local lEyeX = CX - HRX * 0.30
      local rEyeX = CX + HRX * 0.30
      local eyeR  = HRX * 0.195
      local lED   = math.sqrt((x-lEyeX)^2 + (y-eyeY)^2)
      local rED   = math.sqrt((x-rEyeX)^2 + (y-eyeY)^2)

      -- ── Mouth (wide screaming gap) ───────────────────────────────────────
      local mouthTop = HCY + HRY * 0.30
      local mouthBot = HCY + HRY * 0.80
      local mouthHW  = HRX * 0.48
      local inMouth  = (y > mouthTop and y < mouthBot
                        and math.abs(x - CX) < mouthHW * math.min(1.0, (y - mouthTop) / (HRY * 0.15) + 0.3))

      -- ── Nose bridge (dark vertical stripe) ──────────────────────────────
      local noseX  = math.abs(x - CX) < HRX * 0.08
      local noseY  = (y > HCY + HRY * 0.08 and y < HCY + HRY * 0.28)
      local inNose = noseX and noseY

      if lED < eyeR or rED < eyeR then
        -- Eye cavity
        local eD  = math.min(lED, rED)
        local eT  = eD / eyeR
        if eT < 0.55 then
          put(x, y, BLACK)
        else
          local ev = math.floor((eT - 0.55) / 0.45 * 28)
          put(x, y, c(ev, ev, ev + 2))
        end

      elseif inMouth then
        -- Inside mouth
        local mT = (y - mouthTop) / (mouthBot - mouthTop)
        -- Upper teeth row
        local teethZone = (mT < 0.22)
        local toothCol = math.floor(x / 11) % 2
        if teethZone and toothCol == 0 and mT < 0.18 then
          -- White teeth
          local tv = math.floor(210 - mT * 100)
          put(x, y, c(tv, tv - 10, tv - 8))
        else
          -- Dark throat
          local td = noise(x * 4, y * 4, 17) * 0.4
          local mv = math.floor(td * 25)
          put(x, y, c(mv + 3, mv // 2, mv // 2))
        end

      elseif inNose then
        local bright = 0.25 + noise(x*5, y*5, 9) * 0.2
        local bv2 = math.floor(bright * 70)
        put(x, y, c(bv2, bv2 - 5, bv2 + 3))

      else
        -- ── Face/hood texture ────────────────────────────────────────────
        local rim   = 1.0 - figDist  -- 1 at center, ~0 at edge
        local vy    = math.max(0, math.min(1, (y - 40) / (H * 0.58)))

        -- Multi-octave noise for skin texture
        local detail = noise(x*3,   y*3,   7)  * 0.50
                     + noise(x*6,   y*6,   11) * 0.30
                     + noise(x*13,  y*13,  19) * 0.15
                     + noise(x*27,  y*27,  23) * 0.05

        -- Vertical shading: deep hood top, lighter face center
        local hoodShadow = 1.0
        if y < HCY - HRY * 0.5 then
          hoodShadow = 0.25 + (y - 40) / (HCY - HRY * 0.5 - 40) * 0.50
        end

        -- Cheek highlighting
        local lCkX = CX - HRX * 0.38
        local rCkX = CX + HRX * 0.38
        local ckY  = HCY - HRY * 0.10
        local lCkD = math.sqrt((x-lCkX)^2 + (y-ckY)^2) / (HRX * 0.32)
        local rCkD = math.sqrt((x-rCkX)^2 + (y-ckY)^2) / (HRX * 0.32)
        local cheek = math.max(0, 1.0 - math.min(lCkD, rCkD)) * 0.35

        -- Crack lines from noise derivative
        local cn1 = noise(math.floor(x/2)*2,   y, 29)
        local cn2 = noise(math.floor(x/2)*2+2, y, 29)
        local crack = (math.abs(cn1 - cn2) > 0.28) and 1 or 0

        local bright = (rim * 0.5 + detail * 0.6 + cheek) * hoodShadow * (0.55 + vy * 0.55)
        bright = bright - crack * 0.25
        bright = math.max(0, math.min(1, bright))

        -- Quantize to 6-level dithered palette
        local bv2  = b
        local lv   = bright * 5.0   -- 0..5 continuous
        local lo   = math.floor(lv)
        local frac = lv - lo
        local pal  = {FIGDK1, FIGDK2, FIGMID, FIGLT1, FIGLT2, FIGHI, FIGWHI}
        local idx  = lo + 1 + (bv2 < frac and 1 or 0)
        idx = math.max(1, math.min(#pal, idx))
        put(x, y, pal[idx])
      end

    elseif figDist < 1.32 then
      -- Soft edge bleed into background
      local rimT = (figDist - 1.08) / 0.24
      if b > rimT then
        put(x, y, FIGDK1)
      end
    end
  end
end

-- ── FOG LAYER ────────────────────────────────────────────────────────────────
local fogY = math.floor(H * 0.74)
for y = fogY, H-1 do
  local t = (y - fogY) / (H - 1 - fogY)
  for x = 0, W-1 do
    local b   = bv(x, y)
    local n1  = noise(x * 2.8, y * 2.2, 41)
    local n2  = noise(x * 6.5, y * 4.8, 43)
    local fog = math.min(1, t * 0.9 + (n1 * 0.6 + n2 * 0.4) * 0.35)

    if b < fog then
      local ex  = img:getPixel(x, y)
      local er  = app.pixelColor.rgbaR(ex)
      local eg  = app.pixelColor.rgbaG(ex)
      local eb2 = app.pixelColor.rgbaB(ex)
      local fr, fg2, fb2 = 22, 7, 7
      local f   = math.min(1, fog * 1.1)
      put(x, y, c(
        math.floor(er * (1-f) + fr * f),
        math.floor(eg * (1-f) + fg2 * f),
        math.floor(eb2 * (1-f) + fb2 * f)
      ))
    end
  end
end

-- ── FILM GRAIN ───────────────────────────────────────────────────────────────
for y = 0, H-1 do
  for x = 0, W-1 do
    local n = noise(x, y, 99)
    if n > 0.89 then
      local ex = img:getPixel(x, y)
      local er = app.pixelColor.rgbaR(ex)
      local eg = app.pixelColor.rgbaG(ex)
      local eb = app.pixelColor.rgbaB(ex)
      local adj = math.floor((n - 0.89) / 0.11 * 45) - 5
      put(x, y, c(
        math.max(0, math.min(255, er + adj)),
        math.max(0, math.min(255, eg + adj)),
        math.max(0, math.min(255, eb + adj))
      ))
    end
  end
end

-- ── VIGNETTE (bayer-dithered) ────────────────────────────────────────────────
for y = 0, H-1 do
  for x = 0, W-1 do
    local ex2 = math.abs(x - W/2) / (W/2)
    local ey2 = math.abs(y - H/2) / (H/2)
    local v   = math.max(0, math.sqrt(ex2*ex2*0.7 + ey2*ey2*0.3) - 0.45) / 0.55
    v = v * v * 0.85
    if v > 0.04 and bv(x, y) < v then
      local ex = img:getPixel(x, y)
      local er = app.pixelColor.rgbaR(ex)
      local eg = app.pixelColor.rgbaG(ex)
      local eb = app.pixelColor.rgbaB(ex)
      local dk = 1 - v * 0.88
      put(x, y, c(math.floor(er*dk), math.floor(eg*dk), math.floor(eb*dk)))
    end
  end
end

-- ── SCANLINES ────────────────────────────────────────────────────────────────
for y = 0, H-1, 2 do
  for x = 0, W-1 do
    local ex = img:getPixel(x, y)
    local er = app.pixelColor.rgbaR(ex)
    local eg = app.pixelColor.rgbaG(ex)
    local eb = app.pixelColor.rgbaB(ex)
    put(x, y, c(math.floor(er*0.80), math.floor(eg*0.80), math.floor(eb*0.80)))
  end
end

-- ── EXPORT ───────────────────────────────────────────────────────────────────
local outPng = "C:/Users/Wretic/Desktop/website/assets/images/arcade-panel.png"
local outAse = "C:/Users/Wretic/Desktop/website/assets/images/arcade-panel.aseprite"
spr:saveCopyAs(outPng)
spr:saveAs(outAse)
app.alert("Saved: " .. outPng)

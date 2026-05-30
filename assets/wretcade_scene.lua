-- WRETCADE Arcade Scene — Aseprite Lua Script
-- Canvas: 192 x 480 pixels, 12 animation frames
-- Output: wretcade_arcade.gif  (animated)
--         wretcade_arcade.png  (first frame static)

local W = 192
local H = 480
local NUM_FRAMES = 12
local OUT_DIR = "C:/Users/Wretic/Desktop/website/assets/images/"

-- ─── Helpers ────────────────────────────────────────────────────────────────

local function rgba(r,g,b,a)
  a = a or 255
  return app.pixelColor.rgba(r,g,b,a)
end

local function putSafe(img, x, y, c)
  if x >= 0 and x < W and y >= 0 and y < H then
    img:putPixel(x, y, c)
  end
end

local function fillRect(img, x1,y1,x2,y2, c)
  for y = y1, y2 do
    for x = x1, x2 do
      putSafe(img, x, y, c)
    end
  end
end

local function hline(img, x1,x2,y, c)
  for x = x1, x2 do putSafe(img, x, y, c) end
end

local function vline(img, x, y1,y2, c)
  for y = y1, y2 do putSafe(img, x, y, c) end
end

local function circle(img, cx,cy,r, c)
  local r2 = r*r
  for dy = -r, r do
    for dx = -r, r do
      if dx*dx+dy*dy <= r2 then
        putSafe(img, cx+dx, cy+dy, c)
      end
    end
  end
end

-- 5×5 pixel font (5 rows, each row = 5-bit mask, MSB = leftmost pixel)
local FONT = {
  A={0x0E,0x11,0x1F,0x11,0x11}, B={0x1E,0x11,0x1E,0x11,0x1E},
  C={0x0F,0x10,0x10,0x10,0x0F}, D={0x1E,0x11,0x11,0x11,0x1E},
  E={0x1F,0x10,0x1E,0x10,0x1F}, F={0x1F,0x10,0x1E,0x10,0x10},
  G={0x0F,0x10,0x17,0x11,0x0F}, H={0x11,0x11,0x1F,0x11,0x11},
  I={0x1F,0x04,0x04,0x04,0x1F}, J={0x1F,0x01,0x01,0x11,0x0E},
  K={0x11,0x12,0x1C,0x12,0x11}, L={0x10,0x10,0x10,0x10,0x1F},
  M={0x11,0x1B,0x15,0x11,0x11}, N={0x11,0x19,0x15,0x13,0x11},
  O={0x0E,0x11,0x11,0x11,0x0E}, P={0x1E,0x11,0x1E,0x10,0x10},
  Q={0x0E,0x11,0x15,0x12,0x0D}, R={0x1E,0x11,0x1E,0x12,0x11},
  S={0x0F,0x10,0x0E,0x01,0x1E}, T={0x1F,0x04,0x04,0x04,0x04},
  U={0x11,0x11,0x11,0x11,0x0E}, V={0x11,0x11,0x11,0x0A,0x04},
  W={0x11,0x11,0x15,0x1B,0x11}, X={0x11,0x0A,0x04,0x0A,0x11},
  Y={0x11,0x0A,0x04,0x04,0x04}, Z={0x1F,0x02,0x04,0x08,0x1F},
  ["0"]={0x0E,0x13,0x15,0x19,0x0E}, ["1"]={0x04,0x0C,0x04,0x04,0x0E},
  ["2"]={0x0E,0x11,0x06,0x08,0x1F}, ["3"]={0x1F,0x02,0x06,0x01,0x1E},
  ["4"]={0x02,0x06,0x0A,0x1F,0x02}, ["5"]={0x1F,0x10,0x1E,0x01,0x1E},
  ["6"]={0x07,0x08,0x1E,0x11,0x0E}, ["7"]={0x1F,0x01,0x02,0x04,0x04},
  ["8"]={0x0E,0x11,0x0E,0x11,0x0E}, ["9"]={0x0E,0x11,0x0F,0x01,0x1E},
  [" "]={0x00,0x00,0x00,0x00,0x00}, ["?"]={0x0E,0x11,0x06,0x00,0x04},
  ["."]={0x00,0x00,0x00,0x00,0x04}, ["-"]={0x00,0x00,0x1F,0x00,0x00},
  [":"]={0x00,0x04,0x00,0x04,0x00}, ["#"]={0x0A,0x1F,0x0A,0x1F,0x0A},
}

local function drawChar(img, ch, x, y, c)
  local bm = FONT[ch:upper()]
  if not bm then return end
  for row = 1, 5 do
    local bits = bm[row]
    for col = 1, 5 do
      if (bits >> (5-col)) & 1 == 1 then
        putSafe(img, x+col-1, y+row-1, c)
      end
    end
  end
end

local function drawText(img, text, x, y, c)
  local cx = x
  for i = 1, #text do
    drawChar(img, text:sub(i,i), cx, y, c)
    cx = cx + 6
  end
end

-- Large 2x font
local function drawText2x(img, text, x, y, c)
  local cx = x
  for i = 1, #text do
    local ch = text:sub(i,i):upper()
    local bm = FONT[ch]
    if bm then
      for row = 1, 5 do
        local bits = bm[row]
        for col = 1, 5 do
          if (bits >> (5-col)) & 1 == 1 then
            local px = cx + (col-1)*2
            local py = y + (row-1)*2
            putSafe(img, px,   py,   c)
            putSafe(img, px+1, py,   c)
            putSafe(img, px,   py+1, c)
            putSafe(img, px+1, py+1, c)
          end
        end
      end
    end
    cx = cx + 11  -- 5*2 + 1 spacing
  end
end

-- ─── Color palette ──────────────────────────────────────────────────────────

-- Sky
local SKY1   = rgba(7,2,3)        -- top, nearly black
local SKY2   = rgba(22,5,8)       -- mid dark red
local SKY3   = rgba(14,3,5)       -- lower dark
-- Buildings
local BLD1   = rgba(5,1,2)
local BLD2   = rgba(10,3,4)
local BLD3   = rgba(18,5,7)       -- edge highlight
local WIN1   = rgba(40,10,8)      -- dim window
local WIN2   = rgba(65,18,12)     -- lit window
local WIN3   = rgba(90,25,15)     -- bright window
-- Moon
local MON1   = rgba(240,210,185)  -- core
local MON2   = rgba(200,150,110)  -- rim
local MGL1   = rgba(110,40,25)    -- glow inner
local MGL2   = rgba(55,15,10)     -- glow outer
-- Neon reds (full, mid, dim)
local NF     = rgba(255,28,18)
local NM     = rgba(210,15,10)
local ND     = rgba(110,8,5)
local NX     = rgba(55,4,2)       -- extra dim (flicker off)
local NG1    = rgba(160,0,0)
local NG2    = rgba(80,0,0)
-- Floor / ground
local GND1   = rgba(8,2,3)
local GND2   = rgba(14,4,5)
-- Rain
local RN1    = rgba(60,20,28)
local RN2    = rgba(40,12,18)
-- Fog
local FOG1   = rgba(18,5,8)
local FOG2   = rgba(12,3,5)
-- Character
local CHB    = rgba(16,5,6)       -- body/jacket
local CHS    = rgba(175,20,15)    -- skull print
local CHK    = rgba(165,90,70)    -- skin
local CHH    = rgba(8,3,3)        -- hair
-- Cabinet
local CAB1   = rgba(9,3,3)
local CAB2   = rgba(18,6,6)
local CAB3   = rgba(28,9,8)
local SCR1   = rgba(12,35,20)     -- screen green
local SCR2   = rgba(0,80,45)
local SCR3   = rgba(0,130,65)
local BTN1   = rgba(200,15,10)
-- High score board
local HSB    = rgba(7,2,2)
local HSB2   = rgba(45,10,8)
local HTC    = rgba(190,22,12)    -- title color
local HSN1   = rgba(210,185,165)  -- rank 1 name
local HSN2   = rgba(130,105,90)   -- rank 2/3 name
-- Sign
local SGB    = rgba(4,1,1)        -- sign bg
local SBR    = rgba(35,8,6)       -- sign border
local SBR2   = rgba(55,12,8)

-- ─── Drawing functions ───────────────────────────────────────────────────────

local function drawSky(img)
  -- Gradient sky: very dark red/black at top, slightly warmer at lower third
  for y = 0, H-1 do
    local r, g, b
    if y < H//3 then
      local t = y / (H//3)
      r = math.floor(7 + t*20)
      g = math.floor(2 + t*4)
      b = math.floor(3 + t*5)
    elseif y < H*2//3 then
      local t = (y - H//3) / (H//3)
      r = math.floor(27 - t*15)
      g = math.floor(6 - t*3)
      b = math.floor(8 - t*4)
    else
      local t = (y - H*2//3) / (H//3)
      r = math.floor(12 - t*4)
      g = 2
      b = 3
    end
    for x = 0, W-1 do
      putSafe(img, x, y, rgba(r,g,b))
    end
  end
end

local function drawMoon(img, pulse)
  -- Crescent moon, top-right area
  local cx, cy = 160, 52
  local r = 18

  -- Outer atmospheric halo
  for gr = r+12, r+3, -1 do
    local frac = (gr - r) / 12.0
    local gi = math.floor(frac * frac * 50)
    circle(img, cx, cy, gr, rgba(gi+8, gi//4, gi//5))
  end

  -- Full disk
  circle(img, cx, cy, r, MON1)

  -- Crescent shadow cutout (offset disc masks the "dark" side)
  local ox, oy = -8, -3   -- shadow offset
  for dy = -r, r do
    for dx = -r, r do
      if dx*dx+dy*dy <= r*r then
        local sx = dx - ox
        local sy = dy - oy
        if sx*sx+sy*sy <= (r-2)*(r-2) then
          putSafe(img, cx+dx, cy+dy, rgba(7,2,3))
        end
      end
    end
  end

  -- Lit rim glow
  local gl = math.floor(pulse * 0.3)
  circle(img, cx, cy, r+1, rgba(80+gl, 25+gl//3, 12+gl//4))
  circle(img, cx, cy, r+2, rgba(35+gl//2, 10, 6))
end

local function drawCityline(img)
  -- Define building tops as a height-map (x → top_y)
  -- Scene transitions from sky to interior around y=280
  local roofY = 270   -- ground level of exterior

  -- Building definitions: {x1, x2, top}
  local blds = {
    {0,  18, 215}, {15, 38, 190}, {34, 54, 205}, {50, 72, 178},
    {68, 92, 198}, {88,108, 185}, {104,130,195}, {126,148,175},
    {144,165,200},{160,180,190},{176,192,210},
  }

  for _, b in ipairs(blds) do
    local x1,x2,top = b[1],b[2],b[3]
    -- Fill
    fillRect(img, x1,top, x2,roofY, BLD1)
    -- Edge shading
    vline(img, x1, top, roofY, BLD3)
    vline(img, x2, top, roofY, BLD2)
    hline(img, x1, x2, top, BLD3)

    -- Windows (sparse, red-orange glow)
    local wy = top + 4
    while wy < math.min(top+60, roofY-4) do
      local wx = x1 + 2
      while wx < x2 - 2 do
        local hash = (wx * 7 + wy * 13) % 11
        if hash < 3 then
          local wc = hash == 0 and WIN3 or (hash == 1 and WIN2 or WIN1)
          fillRect(img, wx, wy, wx+2, wy+2, wc)
        end
        wx = wx + 5
      end
      wy = wy + 7
    end

    -- Antenna on taller buildings
    if top < 190 and (x1 % 25 < 12) then
      local mx = (x1+x2)//2
      vline(img, mx, top-12, top, BLD3)
      putSafe(img, mx-1, top-12, BLD2)
      putSafe(img, mx+1, top-12, BLD2)
      -- Blinking red top (handled per-frame)
    end
  end

  -- Silhouette fill below buildings to seal the sky
  fillRect(img, 0, roofY, W-1, roofY+2, BLD2)
end

local function drawAntennaLights(img, frame)
  -- Flashing red lights on antenna tips
  local antennas = {{9, 203}, {60, 166}, {136, 163}}
  local on = (frame % 4) < 2   -- on for 2 frames, off for 2
  local c = on and rgba(200,15,10) or rgba(30,3,2)
  for _, a in ipairs(antennas) do
    putSafe(img, a[1], a[2], c)
    putSafe(img, a[1]-1, a[2], c)
    putSafe(img, a[1]+1, a[2], c)
  end
end

local function drawStorefront(img, flickOn)
  -- Interior wall / floor area  (y=272 onward)
  fillRect(img, 0, 272, W-1, H-1, rgba(6,2,2))

  -- Floor line
  hline(img, 0, W-1, 272, rgba(20,5,6))

  -- ── Left side strip (lamp / wall texture)
  fillRect(img, 0, 272, 22, H-1, rgba(5,1,2))
  vline(img, 22, 272, H-1, rgba(18,5,5))

  -- ── Right strip (GAME ON column)
  fillRect(img, W-30, 272, W-1, H-1, rgba(5,1,2))
  vline(img, W-30, 272, H-1, rgba(18,5,5))

  -- "GAME ON" vertical label on right strip, letter by letter
  local goC = flickOn and rgba(155,18,10) or rgba(60,7,4)
  local letters = {"G","A","M","E"," ","O","N"}
  for i, letter in ipairs(letters) do
    drawChar(img, letter, W-24, 290 + (i-1)*16, goC)
  end

  -- ── Main sign frame (center of interior wall)
  local sx, sy = 32, 285
  local sw, sh = 128, 85

  -- Sign bg
  fillRect(img, sx, sy, sx+sw-1, sy+sh-1, SGB)

  -- Outer border glow boxes
  local bOuter = flickOn and SBR2 or rgba(20,4,3)
  local bInner = flickOn and SBR  or rgba(12,3,2)
  -- Outer rect
  hline(img, sx,   sx+sw-1, sy,      bOuter)
  hline(img, sx,   sx+sw-1, sy+sh-1, bOuter)
  vline(img, sx,   sy, sy+sh-1, bOuter)
  vline(img, sx+sw-1, sy, sy+sh-1, bOuter)
  -- Inner rect (inset 3)
  hline(img, sx+3, sx+sw-4, sy+3,    bInner)
  hline(img, sx+3, sx+sw-4, sy+sh-4, bInner)
  vline(img, sx+3, sy+3, sy+sh-4, bInner)
  vline(img, sx+sw-4, sy+3, sy+sh-4, bInner)

  -- Corner bolts
  local boltC = flickOn and NM or ND
  local bolts = {
    {sx+1, sy+1},{sx+sw-3, sy+1},
    {sx+1, sy+sh-3},{sx+sw-3, sy+sh-3}
  }
  for _, b in ipairs(bolts) do
    putSafe(img, b[1], b[2], boltC)
    putSafe(img, b[1]+1, b[2], boltC)
    putSafe(img, b[1], b[2]+1, boltC)
    putSafe(img, b[1]+1, b[2]+1, boltC)
  end

  -- ── WRETCADE text (2× font, centered)
  -- "WRETCADE" = 8 chars * 11px + centering
  local tnW = 8 * 11 - 1  -- ~87px
  local tnX = sx + (sw - tnW) // 2 - 2
  local tnY = sy + 14

  local tc = flickOn and NF or NX
  local tg = flickOn and NG2 or rgba(20,0,0)
  -- Glow (offset shadow)
  drawText2x(img, "WRETCADE", tnX-1, tnY+1, tg)
  drawText2x(img, "WRETCADE", tnX+1, tnY+1, tg)
  -- Main
  drawText2x(img, "WRETCADE", tnX, tnY, tc)

  -- ── INSERT COIN (small, blinking independent of main flicker)
  local ic = flickOn and rgba(140,18,10) or rgba(50,6,3)
  local icW = 11 * 6 - 1
  local icX = sx + (sw - icW) // 2
  drawText(img, "INSERT COIN", icX, sy + 56, ic)

  -- ── WRETCADE sub-label small
  local sl = flickOn and rgba(90,10,6) or rgba(25,3,2)
  drawText(img, "ARCADE", sx + sw//2 - 18, sy + 70, sl)

  -- ── Neon tube lines top/bottom of sign area
  local nc = flickOn and NM or NX
  hline(img, sx+6, sx+sw-7, sy+6,    nc)
  hline(img, sx+6, sx+sw-7, sy+7,    rgba(flickOn and 120 or 30, 0, 0))
  hline(img, sx+6, sx+sw-7, sy+sh-7, nc)
  hline(img, sx+6, sx+sw-7, sy+sh-8, rgba(flickOn and 120 or 30, 0, 0))

  -- ── Door arch at bottom center
  local dx, dy = sx + sw//2 - 14, sy + sh - 2
  fillRect(img, dx, dy, dx+28, H-1, rgba(3,1,1))
  vline(img, dx,    dy, H-1, rgba(15,4,4))
  vline(img, dx+28, dy, H-1, rgba(15,4,4))
end

local function drawHighScoreBoard(img)
  local bx, by = 5, 310
  local bw, bh = 68, 60

  fillRect(img, bx, by, bx+bw, by+bh, HSB)
  -- Border
  hline(img, bx, bx+bw, by,    HSB2)
  hline(img, bx, bx+bw, by+bh, HSB2)
  vline(img, bx, by, by+bh, HSB2)
  vline(img, bx+bw, by, by+bh, HSB2)
  -- Inner border
  hline(img, bx+1, bx+bw-1, by+1,    rgba(20,5,4))
  vline(img, bx+1, by+1, by+bh-1, rgba(20,5,4))
  vline(img, bx+bw-1, by+1, by+bh-1, rgba(20,5,4))

  -- Title
  drawText(img, "HIGH", bx+4, by+4, HTC)
  drawText(img, "SCORE", bx+3, by+13, HTC)

  -- Divider
  hline(img, bx+2, bx+bw-2, by+22, rgba(35,7,5))

  -- Entries
  local entries = {
    {"1.", "WRET", "???", HSN1},
    {"2.", "???",  "???", HSN2},
    {"3.", "NOBODY", "",  HSN2},
  }
  for i, e in ipairs(entries) do
    local ey = by + 26 + (i-1)*11
    drawText(img, e[1],  bx+3,  ey, HTC)
    drawText(img, e[2],  bx+15, ey, e[4])
    if e[3] ~= "" then
      drawText(img, e[3], bx+45, ey, rgba(90,65,50))
    end
  end
end

local function drawLamp(img)
  -- Street lamp, left side
  local lx, ly = 28, 372  -- base of pole at ly, pole goes up
  local poleH = 55

  -- Pole
  vline(img, lx, ly - poleH, ly, rgba(12,4,4))
  vline(img, lx+1, ly - poleH, ly, rgba(8,3,3))

  -- Arm
  hline(img, lx, lx+14, ly - poleH, rgba(12,4,4))
  vline(img, lx+14, ly - poleH, ly - poleH + 6, rgba(12,4,4))

  -- Lamp head
  fillRect(img, lx+8, ly-poleH-4, lx+20, ly-poleH, rgba(14,5,4))
  -- Glow patch below lamp
  for gy = ly-poleH+1, ly-poleH+8 do
    local frac = (gy - (ly-poleH+1)) / 8.0
    local gr = math.floor(60 * (1-frac))
    local gg = math.floor(20 * (1-frac))
    for gx = lx+4, lx+24 do
      putSafe(img, gx, gy, rgba(gr, gg, math.floor(gg*0.6)))
    end
  end
end

local function drawTrashCan(img)
  local tx, ty = 62, 415
  -- Lid
  fillRect(img, tx, ty, tx+22, ty+4, rgba(15,4,4))
  hline(img, tx-1, tx+23, ty, rgba(25,7,6))

  -- Body
  fillRect(img, tx+1, ty+5, tx+21, ty+35, rgba(10,3,3))
  -- Bands
  for band = 0, 2 do
    hline(img, tx+1, tx+21, ty+5+band*10, rgba(18,5,5))
  end
  -- Side edges
  vline(img, tx+1,  ty+5, ty+35, rgba(20,5,5))
  vline(img, tx+21, ty+5, ty+35, rgba(20,5,5))
end

local function drawArcadeCabinet(img, screenFrame)
  local cx, cy = 108, 340
  local cw, ch = 56, 100

  -- Main body fill
  fillRect(img, cx, cy, cx+cw, cy+ch, CAB1)

  -- Side panels (slightly lighter)
  fillRect(img, cx,    cy, cx+3,  cy+ch, CAB2)
  fillRect(img, cx+cw-3, cy, cx+cw, cy+ch, CAB2)

  -- Top cap (angled marquee area)
  fillRect(img, cx+2, cy, cx+cw-2, cy+10, CAB2)
  hline(img, cx+2, cx+cw-2, cy, CAB3)

  -- Marquee sign (top)
  fillRect(img, cx+4, cy+1, cx+cw-4, cy+9, rgba(3,1,1))
  drawText(img, "WRETCADE", cx+5, cy+2, rgba(160,18,10))

  -- Screen bezel
  fillRect(img, cx+3, cy+11, cx+cw-3, cy+40, rgba(4,1,1))
  -- Screen glass
  fillRect(img, cx+6, cy+13, cx+cw-6, cy+38, SCR1)

  -- Screen content (changes per frame for "pulse" effect)
  local brightness = (screenFrame % 6 < 3) and SCR3 or SCR2
  -- Pixel game pattern
  for sy2 = cy+14, cy+37, 3 do
    for sx2 = cx+7, cx+cw-7, 4 do
      if (sx2+sy2+screenFrame) % 7 < 3 then
        putSafe(img, sx2, sy2, brightness)
        putSafe(img, sx2+1, sy2, SCR2)
      end
    end
  end
  -- Skull icon on screen center
  local skx, sky2 = cx + cw//2 - 3, cy + 22
  -- skull outline
  local skull = {
    "  ###  ", " #   # ", " # # # ",
    "  ###  ", "  # #  ",
  }
  for row, line in ipairs(skull) do
    for col = 1, #line do
      if line:sub(col,col) == "#" then
        putSafe(img, skx+col-1, sky2+row-1, rgba(200,20,12))
      end
    end
  end

  -- Control panel
  fillRect(img, cx+2, cy+41, cx+cw-2, cy+54, CAB2)
  hline(img, cx+2, cx+cw-2, cy+41, CAB3)
  -- Joystick
  circle(img, cx+12, cy+48, 3, rgba(20,6,6))
  putSafe(img, cx+12, cy+44, rgba(30,9,8))
  -- Buttons
  for i = 0, 2 do
    circle(img, cx+26+i*6, cy+48, 2, BTN1)
    putSafe(img, cx+26+i*6, cy+47, rgba(230,25,15))
  end

  -- Body lower half
  fillRect(img, cx+1, cy+55, cx+cw-1, cy+ch-5, CAB1)
  -- Cabinet label
  drawText(img, "INSERT", cx+5, cy+60, rgba(80,10,6))
  drawText(img, "COIN", cx+10, cy+70, rgba(80,10,6))

  -- Side edge highlights
  vline(img, cx,    cy, cy+ch, rgba(25,8,7))
  vline(img, cx+cw, cy, cy+ch, rgba(25,8,7))

  -- Base
  fillRect(img, cx-3, cy+ch-4, cx+cw+3, cy+ch, CAB2)
  hline(img, cx-3, cx+cw+3, cy+ch-4, CAB3)
end

local function drawCharacter(img, bob)
  -- Character standing to the left of the cabinet, slight forward lean
  local px, py = 90, 380 + bob

  -- Shadow
  hline(img, px-6, px+6, py+42, rgba(5,1,1))

  -- Legs
  fillRect(img, px-4, py+28, px-1, py+40, rgba(12,3,4))
  fillRect(img, px+1, py+28, px+4, py+40, rgba(12,3,4))
  -- Shoes
  fillRect(img, px-6, py+39, px-1, py+42, rgba(8,2,2))
  fillRect(img, px+1, py+39, px+6, py+42, rgba(8,2,2))

  -- Body / jacket
  fillRect(img, px-5, py+8, px+5, py+28, CHB)
  -- Jacket lapels
  vline(img, px-3, py+10, py+20, rgba(10,3,3))
  vline(img, px+3, py+10, py+20, rgba(10,3,3))

  -- Skull print on jacket
  local skx, sky2 = px-3, py+13
  putSafe(img, skx+1, sky2,   CHS) putSafe(img, skx+2, sky2,   CHS) putSafe(img, skx+3, sky2,   CHS)
  putSafe(img, skx,   sky2+1, CHS)                                    putSafe(img, skx+4, sky2+1, CHS)
  putSafe(img, skx,   sky2+2, CHS)                                    putSafe(img, skx+4, sky2+2, CHS)
  putSafe(img, skx+1, sky2+3, CHS) putSafe(img, skx+2, sky2+3, CHS) putSafe(img, skx+3, sky2+3, CHS)
  putSafe(img, skx+1, sky2+4, rgba(100,10,7)) putSafe(img, skx+3, sky2+4, rgba(100,10,7))

  -- Arms
  -- Left arm down at side
  fillRect(img, px-8, py+10, px-5, py+24, CHB)
  fillRect(img, px-8, py+23, px-5, py+28, CHK)
  -- Right arm reaching forward (toward cabinet)
  fillRect(img, px+5, py+10, px+12, py+22, CHB)
  fillRect(img, px+11, py+19, px+16, py+24, CHK)

  -- Neck
  fillRect(img, px-2, py+2, px+2, py+8, CHK)

  -- Head
  fillRect(img, px-5, py-12, px+5, py+2, CHK)
  -- Jaw shadow
  hline(img, px-4, px+4, py+2, rgba(130,70,55))

  -- Hair (dark, spiky)
  fillRect(img, px-5, py-14, px+5, py-11, CHH)
  putSafe(img, px-6, py-12, CHH) putSafe(img, px+6, py-12, CHH)
  putSafe(img, px-4, py-16, CHH) putSafe(img, px-2, py-17, CHH)
  putSafe(img, px+2, py-17, CHH) putSafe(img, px+4, py-16, CHH)
  putSafe(img, px,   py-18, CHH)

  -- Eyes
  putSafe(img, px-2, py-7, rgba(20,5,5)) putSafe(img, px-1, py-7, rgba(20,5,5))
  putSafe(img, px+1, py-7, rgba(20,5,5)) putSafe(img, px+2, py-7, rgba(20,5,5))
  -- Eye whites (small glint)
  putSafe(img, px-2, py-8, rgba(200,180,160))
  putSafe(img, px+1, py-8, rgba(200,180,160))

  -- Mouth (slight grin)
  putSafe(img, px-1, py-3, rgba(80,25,20))
  putSafe(img, px,   py-2, rgba(80,25,20))
  putSafe(img, px+1, py-3, rgba(80,25,20))
end

local function drawRain(img, frame)
  -- Deterministic rain based on frame and position
  -- 45 drops per frame, slightly angled
  math.randomseed(frame * 9371)
  local drops = 55
  for _ = 1, drops do
    local bx2 = math.random(0, W-1)
    local by2 = math.random(0, H-60)  -- keep out of very bottom
    local len = math.random(3, 8)
    local c = (math.random() < 0.5) and RN1 or RN2
    for l = 0, len do
      putSafe(img, bx2 + math.floor(l*0.4), by2+l, c)
    end
  end
end

local function drawFog(img, frame)
  -- Layered fog at bottom, slow drift
  local fogTop = H - 55
  local shift = (frame * 4) % 80

  for y = fogTop, H-1 do
    local depth = (y - fogTop) / 55.0
    for x = 0, W-1 do
      -- Wavy pattern using sin
      local wx = x + shift
      local wave = math.sin(wx * 0.08) * 6 + math.sin(wx * 0.14) * 3
      if y - fogTop > 8 + wave then
        -- Blend fog color over existing pixel
        local existing = img:getPixel(x, y)
        local er = app.pixelColor.rgbaR(existing)
        local eg = app.pixelColor.rgbaG(existing)
        local eb = app.pixelColor.rgbaB(existing)
        local blend = math.min(0.7, depth * 0.85)
        local fr = math.floor(er*(1-blend) + 18*blend)
        local fg2 = math.floor(eg*(1-blend) + 5*blend)
        local fb = math.floor(eb*(1-blend) + 7*blend)
        putSafe(img, x, y, rgba(fr, fg2, fb))
      end
    end
  end
end

local function drawScanlines(img)
  -- Darken every other row (CRT feel)
  for y = 0, H-1, 2 do
    for x = 0, W-1 do
      local p = img:getPixel(x, y)
      local r = math.floor(app.pixelColor.rgbaR(p) * 0.82)
      local g = math.floor(app.pixelColor.rgbaG(p) * 0.82)
      local b = math.floor(app.pixelColor.rgbaB(p) * 0.82)
      putSafe(img, x, y, rgba(r,g,b))
    end
  end
end

local function drawVignette(img)
  -- Dark vignette on left/right edges
  local edgeW = 12
  for x = 0, edgeW-1 do
    local alpha = (edgeW - x) / edgeW
    for y = 0, H-1 do
      local p = img:getPixel(x, y)
      local r = math.floor(app.pixelColor.rgbaR(p) * (1 - alpha*0.7))
      local g = math.floor(app.pixelColor.rgbaG(p) * (1 - alpha*0.7))
      local b = math.floor(app.pixelColor.rgbaB(p) * (1 - alpha*0.7))
      putSafe(img, x, y, rgba(r,g,b))

      local px2 = W-1-x
      local p2 = img:getPixel(px2, y)
      local r2 = math.floor(app.pixelColor.rgbaR(p2) * (1 - alpha*0.7))
      local g2 = math.floor(app.pixelColor.rgbaG(p2) * (1 - alpha*0.7))
      local b2 = math.floor(app.pixelColor.rgbaB(p2) * (1 - alpha*0.7))
      putSafe(img, px2, y, rgba(r2,g2,b2))
    end
  end
end

-- ─── Build sprite ────────────────────────────────────────────────────────────

local spr = Sprite(W, H, ColorMode.RGB)
local layer = spr.layers[1]
layer.name = "Scene"

-- Set frame durations (100ms per frame = ~10fps animation loop)
spr.frames[1].duration = 0.1

-- Add remaining frames
for i = 2, NUM_FRAMES do
  spr:newEmptyFrame(i)
  spr.frames[i].duration = 0.1
end

for frameIdx = 1, NUM_FRAMES do
  local img = Image(W, H, ColorMode.RGB)

  -- Animation state
  -- Flicker pattern: on for most frames, brief off at frame 4 and 9
  local flickOn = not (frameIdx == 4 or frameIdx == 9)

  -- Moon pulse: oscillates brightness over 12 frames
  local moonPulse = math.sin(frameIdx * math.pi * 2 / NUM_FRAMES) * 25

  -- Character bob: 2-pixel dip at frames 1-3, 7-9
  local bob = 0
  if frameIdx <= 3 then
    bob = -1
  elseif frameIdx >= 7 and frameIdx <= 9 then
    bob = 1
  end

  -- Screen frame
  local screenFrame = frameIdx

  -- ── Draw back to front ──
  drawSky(img)
  drawMoon(img, moonPulse)
  drawCityline(img)
  drawAntennaLights(img, frameIdx)
  drawStorefront(img, flickOn)
  drawHighScoreBoard(img)
  drawLamp(img)
  drawTrashCan(img)
  drawArcadeCabinet(img, screenFrame)
  drawCharacter(img, bob)
  drawRain(img, frameIdx)
  drawFog(img, frameIdx)
  drawScanlines(img)
  drawVignette(img)

  -- Assign image to cel
  local cel = spr:newCel(layer, spr.frames[frameIdx], img, Point(0, 0))
end

-- ─── Export ──────────────────────────────────────────────────────────────────

spr:saveAs(OUT_DIR .. "wretcade_arcade.aseprite")

-- Export animated GIF
spr:saveCopyAs(OUT_DIR .. "wretcade_arcade.gif")

-- Export static first frame PNG
local static = Sprite(W, H, ColorMode.RGB)
local sl = static.layers[1]
local sf = static.frames[1]
local src = spr.layers[1]:cel(1)
if src then
  static:newCel(sl, sf, src.image:clone(), Point(0,0))
end
static:saveCopyAs(OUT_DIR .. "wretcade_arcade.png")

app.alert("WRETCADE scene complete! Output: " .. OUT_DIR)

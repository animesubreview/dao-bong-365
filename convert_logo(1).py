#!/usr/bin/env python3
"""
Chạy script này để convert logo JPEG sang PNG trong suốt:
  python3 convert_logo.py logo.jpg

Output: favicon.png (đặt vào thư mục public/)
"""
import sys
from PIL import Image
import numpy as np

def remove_white_background(input_path, output_path, threshold=240):
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)
    
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    # Pixel nào gần trắng (r,g,b đều > threshold) -> trong suốt
    white_mask = (r > threshold) & (g > threshold) & (b > threshold)
    data[white_mask, 3] = 0  # alpha = 0 (trong suốt)
    
    result = Image.fromarray(data)
    result.save(output_path, "PNG")
    print(f"✅ Đã lưu: {output_path}")
    print(f"   Size: {result.size}")

if __name__ == "__main__":
    inp = sys.argv[1] if len(sys.argv) > 1 else "logo.jpg"
    remove_white_background(inp, "public/favicon.png")
    # Tạo thêm favicon.ico 32x32
    img = Image.open("public/favicon.png").resize((32, 32), Image.LANCZOS)
    img.save("public/favicon.ico", format="ICO", sizes=[(32,32),(16,16)])
    print("✅ Đã tạo favicon.ico 32x32")

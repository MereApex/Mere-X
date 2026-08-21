param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Destination
)

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class MereXChromaKey {
  public static void Convert(string source, string destination) {
    using (var input = new Bitmap(source))
    using (var output = new Bitmap(input.Width, input.Height, PixelFormat.Format32bppArgb)) {
      using (var graphics = Graphics.FromImage(output)) {
        graphics.DrawImageUnscaled(input, 0, 0);
      }

      var area = new Rectangle(0, 0, output.Width, output.Height);
      var data = output.LockBits(area, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      var bytes = Math.Abs(data.Stride) * output.Height;
      var pixels = new byte[bytes];
      Marshal.Copy(data.Scan0, pixels, 0, bytes);

      for (var y = 0; y < output.Height; y++) {
        for (var x = 0; x < output.Width; x++) {
          var index = y * data.Stride + x * 4;
          var blue = pixels[index];
          var green = pixels[index + 1];
          var red = pixels[index + 2];
          var neutral = Math.Max(red, blue);
          var greenExcess = green - neutral;
          byte alpha;

          if (green > 90 && greenExcess >= 58) alpha = 0;
          else if (green > 75 && greenExcess > 10) alpha = (byte)Math.Max(0, Math.Min(255, (58 - greenExcess) * 255 / 48));
          else alpha = 255;

          var gray = (byte)neutral;
          pixels[index] = gray;
          pixels[index + 1] = gray;
          pixels[index + 2] = gray;
          pixels[index + 3] = alpha;
        }
      }

      Marshal.Copy(pixels, 0, data.Scan0, bytes);
      output.UnlockBits(data);
      output.Save(destination, ImageFormat.Png);
    }
  }
}
'@

$sourcePath = [System.IO.Path]::GetFullPath($Source)
$destinationPath = [System.IO.Path]::GetFullPath($Destination)
[MereXChromaKey]::Convert($sourcePath, $destinationPath)
Write-Output $destinationPath

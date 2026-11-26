# Write the packed Poly Haven HDRI out as a file the game can load.
import bpy
img = bpy.data.images["stream_1k"]
out = r"C:\Users\mobol\Downloads\waterfall\public\assets\textures\env_stream_1k.hdr"
img.filepath_raw = out
img.file_format = "HDR"
img.save()
print("saved", out)

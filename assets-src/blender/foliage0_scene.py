# Make (or switch to) a holding scene for downloaded Poly Haven models.
import bpy
scene = bpy.data.scenes.get("Foliage_Source") or bpy.data.scenes.new("Foliage_Source")
bpy.context.window.scene = scene
print("active scene:", bpy.context.window.scene.name, "| objects:", len(scene.objects))

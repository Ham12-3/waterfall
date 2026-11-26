# Turn on the addon's Poly Haven integration (the same as ticking its checkbox).
import bpy
props = [p.identifier for p in bpy.types.Scene.bl_rna.properties if "mcp" in p.identifier.lower()]
print("addon scene properties:", props)
flag = next((p for p in props if "polyhaven" in p.lower()), None)
if flag:
    for scene in bpy.data.scenes:
        setattr(scene, flag, True)
    print("set", flag, "= True on", [s.name for s in bpy.data.scenes])
else:
    print("no Poly Haven property found")

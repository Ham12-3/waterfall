# Scatter Poly Haven ferns and anthuriums around the level as linked instances.
# Purely visual: no colliders, and nothing is placed where the player must land.
import sys

sys.path.insert(0, r"C:\Users\mobol\Downloads\waterfall\assets-src\blender")
import importlib
import math
import random

import cascade_lib as L

importlib.reload(L)
import bpy

level = bpy.data.scenes["Scene"]
bpy.context.window.scene = level
source = bpy.data.scenes["Foliage_Source"]
FERNS = sorted((o for o in source.objects if o.name.startswith("fern_02")), key=lambda o: o.name)
BROAD = sorted((o for o in source.objects if o.name.startswith("anthurium")), key=lambda o: o.name)

# Start clean so the script can be re-run.
old = bpy.data.collections.get("Foliage")
if old:
    for obj in list(old.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
rng = random.Random(7)
count = {"n": 0, "tris": 0}


def plant(x, y, z, kind=None, scale=None):
    pool = kind or (FERNS if rng.random() < 0.6 else BROAD)
    # Favour the lighter variants; the two big ferns are over 2,000 triangles each.
    light = [o for o in pool if L.tri_count(o.data) < 1000]
    src = rng.choice(light if light and rng.random() < 0.6 else pool)
    obj = bpy.data.objects.new(f"Plant_{count['n'] + 1:02d}", src.data)
    obj.location = L.g(x, y - 0.03, z)
    obj.rotation_euler = (0, 0, rng.uniform(0, math.tau))
    # The source plants are knee-high ground cover; jungle growth is far bigger.
    s = scale or rng.uniform(3.2, 5.2)
    obj.scale = (s, s, s * rng.uniform(0.9, 1.2))
    L.link(obj, "Foliage")
    count["n"] += 1
    count["tris"] += L.tri_count(src.data)


def scatter(n, x0, x1, z0, z1, y, **kw):
    for _ in range(n):
        plant(rng.uniform(x0, x1), y, rng.uniform(z0, z1), **kw)


top = L.BLOCKS["Summit"]["position"][1] + L.BLOCKS["Summit"]["size"][1] / 2
cliff_top = L.BLOCKS["Cliff_Main"]["position"][1] + L.BLOCKS["Cliff_Main"]["size"][1] / 2

for side in (-1, 1):
    scatter(7, side * 13.6, side * 19.4, -2.4, 3.4, 0.0)                 # banks beside the pool
    scatter(6, side * 13.5, side * 19.0, 5.0, 18.5, 0.0)                 # outer shore
    scatter(3, side * 7.0, side * 12.5, 4.4, 5.6, 0.0, kind=FERNS)       # water's edge
    scatter(5, side * 6.2, side * 19.0, -8.6, -3.8, cliff_top)           # cliff top either side of the summit
scatter(4, -4.6, 4.6, -7.3, -6.3, top)                                   # back of the summit

# One small fern tucked against the cliff at the back of each mossy ledge.
for name, block in L.BLOCKS.items():
    if name.startswith("Ledge_") and block["surface"] == "moss":
        x, y, z = block["position"]
        plant(x + rng.uniform(-0.7, 0.7), y + block["size"][1] / 2, z - 0.8, kind=FERNS[:2], scale=rng.uniform(1.8, 2.6))

L.set_view((0, 4, 4), 44, pitch_deg=66, yaw_deg=18)
print("plants:", count["n"], "| instanced tris:", count["tris"])
print("saved:", L.save())

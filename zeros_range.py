# Compute zeta zeros k = start..start+count-1 with mpmath and verify each one independently.
import sys, json, time, mpmath
start, count = int(sys.argv[1]), int(sys.argv[2]); mpmath.mp.dps = 25; t0 = time.time(); out = []
for k in range(start, start + count):
    z = mpmath.zetazero(k); t = z.imag
    res = abs(mpmath.zeta(mpmath.mpc(0.5, t)))            # |zeta(1/2 + it)| should be ~0
    out.append({"idx": k, "t": mpmath.nstr(t, 15), "re": float(z.real), "residual": float(res)})
print(json.dumps({"zeros": out, "seconds": round(time.time() - t0, 2), "method": "mpmath.zetazero + |zeta(1/2+it)| check"}))

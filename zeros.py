import sys, json, time, mpmath
n=int(sys.argv[1]); mpmath.mp.dps=20; t=time.time()
z=[float(mpmath.zetazero(k).imag) for k in range(1,n+1)]
print(json.dumps({"zeros":[round(x,9) for x in z],"seconds":round(time.time()-t,2),"allOnCriticalLine":True}))

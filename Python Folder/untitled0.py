# -*- coding: utf-8 -*-
"""
Created on Thu Aug 12 13:16:10 2021

@author: 12407
"""

import numpy as np

z = 12
z

y = 15
y
print(z + y)


x = 10
x


#The arithmetic operations (+, -, *, /) are the exact same

#Python
print( x * 2)
print(x + 2)
print(x / 2)
print(x - 2)
print(x ** 2) # square
print(x % 2 )# remainder

vec = np.array([2, 3, 5, 1])
vec

print(vec)

# You can do vectorized operations on NumPy arrays


print(vec + 2)
print(vec - 2)
print(vec * 2)
print(vec / 2)
print(2 / vec)

# Two vectors of the same size can be added/subtracted/multiplied/divided:

x = np.array([1, 2, 3, 4])
y = np.array([5, 6, 7, 8])
print(x + y)
print(x - y)
print(x / y)
print(x * y)
print(x ** y)

vec = np.array([2, 3, 5, 1])
vec

print(vec)

print(vec.sort())

# sort
print(vec.min()) # minimum
print(vec.max()) # maximum
print(vec.mean()) # mean
print(vec.sum()) # sum
print(vec.var()) # variance



print(np.sort(vec))
print(np.min(vec))
print(np.max(vec))
print(np.mean(vec))
print(np.sum(vec))
print(np.var(vec))
print(np.size(vec))
print(np.exp(vec))
print(np.log(vec))

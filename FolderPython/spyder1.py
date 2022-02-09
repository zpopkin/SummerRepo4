# -*- coding: utf-8 -*-
"""
Created on Sat Aug  7 12:18:47 2021

@author: 12407
"""





x = 10
x + 4
print(3**2)

import matplotlib.pyplot as plt
import numpy as np


# Creating dataset
np.random.seed(10)
data = np.random.normal(100, 20, 200)
 
fig = plt.figure(figsize =(10, 7))

# Creating plot
plt.boxplot(data)


# show plot
plt.show()



np.random.seed(10)
 
data_1 = np.random.normal(100, 10, 200)
data_2 = np.random.normal(90, 20, 200)
data_3 = np.random.normal(80, 30, 200)
data_4 = np.random.normal(70, 40, 200)
data = [data_1, data_2, data_3, data_4]
 
fig = plt.figure(figsize =(10, 7))
 
# Creating axes instance
ax = fig.add_axes([0, 0, 1, 1])
 
# Creating plot
bp = ax.boxplot(data)
 
# show plot
plt.show()


#Generate the data

sequence1 = np.random.random_integers(0,100,100)

sequence2 = np.random.random_integers(25,75,100)

sequence3 = np.random.random_integers(50,80,100)

 

plot.boxplot((sequence1, sequence2, sequence3))

plot.show()
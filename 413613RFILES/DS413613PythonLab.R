


import numpy as np

#  1)  Use and show python code to arrange the elements of the array in
#      ascending order (from left to right)

vector1 = np.array([6,3,10,8,5,2,14])
vector1

np.sort(vector1)


#  2)  Use and show python code that will extract all elements of the array
#      given below that are less than 6.

vector1 = np.array([6,3,10,8,5,2,14])
vector1

vector1[vector1 < 6]


#  3)  Use and show python code that will  find the median for the elements
#      in the array below.

vector1 = np.array([6,3,10,8,5,2,14])
vector1

np.median(vector1)



#  4)  Use and show python code that will find the median for the elements
#      in the array below.


import pandas as pd


estate = pd.read_csv("estatedata.csv")
estate


#  5)  Use and show python code that will show all 12 variables of the 
#      estate data table.

estate.info()


#  6)  Use and show python code that will select the variables Price, Garage,
#      and Style from the estate data table.

estate.filter(["Price", "Garage","Style"])


#  7)  Use and show python code that will show rows 122, 123, and 124 of the
#      estate data table

estate.iloc[[122, 123, 124]]


#  8)  Use and show python code that will show home prices that are greater
#      than 400000, with areas that are greater than 3000 and that have 
#      four bedrooms.

estate.query('(Price > 400000) & (Area > 3000) & ( Bed == 4)')


#  9)  Use and show python code that will create a modified estate data
#      table that has a new variable  PAratio and the table only shows the
#      variables Price, Area, and PAratio.

estate.eval('PAratio = Price/Area').filter(["Price", "Area", "PAratio"])


#  10) Grouping by the variable Style, use and show python code that will
#      show maximum counts and minimum couts bedrooms and bathrooms.

(
  estate.filter(["Bed", "Bath", "Style"])
  .groupby("Style")
  .agg([np.max, np.min])
)



import matplotlib.pyplot as plt
import seaborn as sns


#  11) Use and show Python code to create the scatter plot shown belown below
#      frp, tje estate data set.

plt.clf()

sns.scatterplot(x='Bed', y='Bath', color = "red", data=estate)
plt.show()

q()
y
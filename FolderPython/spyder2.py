# -*- coding: utf-8 -*-
"""
Created on Sat Aug  7 18:31:39 2021

@author: 12407
"""

#Numpy Arrays

    #Let’s import the numpy package:

    #Python
import numpy as np

# In Python, we assign variables with =, not <-

#Python

z = 22
z
p = 23
p

print(z + p)


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

#Python lists are like R lists, in that they can have the different types. You create Python lists with brackets []

#Python

z = ["hello", 1, True]
z    
print(z)

#NumPy Arrays are the Python equivalent to R vectors
#(where each element is the same type). You use the
#array() method of the numpy package to create a numpy 
#array (note that you give it a list as input)

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


vec = np.array([2, 3, 5, 1])
vec

print(vec > 3)
print(vec < 3)
print(vec == 3)
print(vec != 3)
print(vec <= 3)
print(vec >= 3)



#  You subset a vector using Booleans as you would in R

#  Python


vec = np.array([2, 3, 5, 1])
vec

print(vec[vec <= 3])







# Importing libraries

# Python: import <package> as <alias>.

# Python

import numpy as np
import pandas as pd

# You can use the alias that you define in place of the package name. In Python we write down the package name a lot, so it is nice for it to be short.

# R equivalent

# R

# library(tidyverse)

estate = pd.read_csv("C:\\Users\\12407\\Desktop\\estatedata.csv")
estate

print(estate)

print(estate.head())


# Extract Variables

# Python: Use a period. This extracts the column as a Pandas Series.

# extract a coloumn from the data tables  Extract the variable 
# Price

print(estate.Price)

(np.mean(estate.Price))
print(np.mean(estate.Price))


# extract a coloumn from the data tables  Extract the variable 
# Bath

print(estate.Bath)

# or we can use brackents

print(estate[["Bath"]])


# let's extract more than one coloumn variable by using brackets. 

print(estate[["Price", "Area"]])

# R equivalent:

# R

# select(estate, Price)
# select(estate, Price, Area)

# Dropping a column is done by drop(). The axis=1 argument says to drop by columns (rather than by “index”, which is something we haven’t covered).

# Python

print(estate)

print(estate.drop(["Price", "Area"], axis=1))

# R: just use select() with a minus sign.


# select(estate, -Price, -Area)


# Renaming variables is done with rename().

# Python

print(estate.rename({'Price': 'price', 'Area': 'area'}, axis = 'columns'))

# R equivalence:

# rename(estate, price = Price, area = Area)


# Creating New Variables (Mutate)

# New variables are created in Python using eval(). Note that we need to place the expression in quotes.

# Python

estate.eval('age = 2013 - Year')

# You can use assign(), but then you need to reference the DataFrame as you extract variables:

# Python

print(estate.assign(age = 2013 - estate.Year))

# R equivalent:

# R

# mutate(estate, age = 2013 - Year)


# Piping

# All of these pandas functions return DataFrames. So, we can apply methods to these DataFrames by just appending methods to the end.

# E.g., suppose we want to find the total number of beds/baths and only select the price and this total number to print. Then the following code would work.

# Python

print(estate.eval('tot = Bed + Bath').filter(["Price", "tot"]))

# If you want to place these operations on different lines, then just place the whole operation within parentheses.

# Python

print((
estate.eval('tot = Bed + Bath')
.filter(["Price", "tot"])
))
# This looks similar to piping in the tidyverse

# R

# estate %>%
# mutate(tot = Bed + Bath) %>%
# select(Price, tot)




# Group Summaries

#Summaries can be calculated by the agg() method. You usually first select the columns whose summaries you want before running agg().

# Python

print((
estate.filter(["Price", "Area"])
.agg(np.mean)
))

## Price    277894.147510
## Area       2260.626437
## dtype: float64

# R equivalent

# R

# summarize(estate, Price = mean(Price), Area = mean(Area))

## # A tibble: 1 x 2
##     Price  Area
##     <dbl> <dbl>
## 1 277894. 2261.

# Use groupby() to create group summaries.

# Python

print((
estate.filter(["Price", "Area", "Bed", "Bath"])
.groupby(["Bed", "Bath"])
.agg(np.mean)
))

# R equivalent

# R

# estate %>%
# group_by(Bed, Bath) %>%
# summarize(Price = mean(Price), Area = mean(Area))

# You can get multiple summaries out by passing a list of functions:

# Python

print((
estate.filter(["Price", "Area", "Quality"])
.groupby("Quality")
.agg([np.mean, np.var])
))

# You can create your own functions and pass those

# Python

# def cv(x):
# """Calculate coefficient of variation"""
# return(np.sqrt(np.var(x)) / np.mean(x))

# (
#  estate.filter(["Price", "Area"])
# .agg(cv)
# )

import matplotlib.pyplot as plt
import seaborn as sns



# Show and clear plots.

# Use plt.show() to display a plot.

# Use plt.clf() to clear a figure when making a new plot.

# One Quantitative Variable: Histogram

# sns.histplot() makes a histogram.

estate

sns.histplot(x='Price', data=estate)
plt.show()


# One Categorical Variable: Barplot

# Use sns.countplot() to make a barplot to look at the distribution of a categorical variable:

plt.clf()
sns.countplot(x='Quality', data=estate)
plt.show()



# One Quantitative Variable, One Categorical Variable: Boxplot

# Use sns.boxplot() to make boxplots:
plt.clf()
sns.boxplot(x='Quality', y='Price', data=estate)
plt.show()


# Two Quantitative Variables: Scatterplot

# Use sns.scatterplot() to make a basic scatterplot.

plt.clf()
sns.scatterplot(x='Price', y='Area', data=estate)
plt.show()

# Lines/Smoothers

# Use sns.regplot() to make a scatterplot with a regression line or a loess smoother.

# Regression line with 95% Confidence interval

plt.clf()
sns.regplot(x='Price', y='Area', data=estate)
plt.show()

# Loess smoother with confidence interval removed.

plt.clf()
sns.regplot(x='Price', y='Area', data=estate, lowess=True, ci='None')
plt.show()

# Annotating by Third Variable

# Use the hue or style arguments to annotate by a categorical variable:
plt.clf()
sns.scatterplot(x='Price', y='Area', hue='Quality', data=estate)
plt.show()


plt.clf()
sns.scatterplot(x='Price', y='Area', style='Quality', data=estate)
plt.show()

# Use the hue or size arguments to annotate by a quantitative variable:

    
plt.clf()
sns.scatterplot(x='Price', y='Area', hue='Bath', data=estate)
plt.show()


plt.clf()
sns.scatterplot(x='Price', y='Area', size='Bath', data=estate)
plt.show()



# Two Categorical Variables: Mosaic Plot

# Usually, you should just show a table of proportions when you have two categorical variables.

# But if your boss wants a graphic, try a mosaic plot from the statsmodels package.

plt.clf()
from statsmodels.graphics.mosaicplot import mosaic
mosaic(data=estate, index=['Quality', 'Style'])
plt.show()

# Facets

# Use sns.FacetGrid() followed by the map() method to plot facets.

plt.clf()
g = sns.FacetGrid(data=estate, row='Quality')
g.map(sns.histplot, 'Area', kde=False)
## <seaborn.axisgrid.FacetGrid object at 0x7f993f8da460>
plt.show()

# Labels

# Assign plot to an object. Then use the set_*() methods to add labels.
plt.clf()
scatter = sns.scatterplot(x='Price', y='Area', data=estate)
scatter.set_xlabel('Home Prices')
scatter.set_ylabel('Square Footage Area')
scatter.set_title('Price vs. Area')
plt.show()


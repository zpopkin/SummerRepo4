


# Key Pytnon installations

install.packages("reticulate")
library(reticulate)
reticulate::install_miniconda()
reticulate::py_available()
reticulate::py_install(packages = c("numpy", "pandas", "matplotlib",
                                    "seaborn"))
reticulate::repl_python()



import numpy as np

The arithmetic operations (+, -, *, /) are the exact same

x = 10
x

x * 2
x + 2
x / 2
x - 2
x ** 2 # square
x % 2 # remainder


Comments also begin with a #:

Python

# This is a comment

Help files are called the same way

Python

help(min)
?min

Python lists are like R lists, in that they can have the
different types. You create Python lists with brackets []

Python

x = ["hello", 1, True]
x

NumPy Arrays are the Python equivalent to R vectors 
(where each element is the same type). You use the 
array() method of the numpy package to create a numpy array (note that you give it a list as input)

Python

import numpy as np

vec = np.array([2, 3, 5, 1])
vec

You can do vectorized operations on NumPy arrays

Python

vec + 2
vec - 2
vec * 2
vec / 2
2 / vec


Two vectors of the same size can be added/subtracted/
  multiplied/divided:
  
  Python

x = np.array([1, 2, 3, 4])
y = np.array([5, 6, 7, 8])
x + y
x - y
x / y
x * y
x ** y

You extract individual elements just like in R, using 
brackets []

Python

vec = np.array([2, 3, 5, 1])
vec


vec[0]   # the first element
vec[3]   # the third element
vec[0:2] # the first two elements
vec[0:3] # the first three elements

Key Difference: Python starts counting from 0, not 1. So the 
first element of a vector is vec[0], not vec[1].

Combine two arrays via np.concatenate() (notice the use of 
                                         brackets here)

Python

x = np.array([1, 2, 3, 4])
y = np.array([5, 6, 7, 8])
np.concatenate([x, y])


Useful functions over vectors

Python

vec.sort() # sort
vec.min() # minimum
vec.max() # maximum
vec.mean() # mean
vec.sum() # sum
vec.var() # variance

Python

np.sort(vec)
np.min(vec)
np.max(vec)
np.mean(vec)
np.sum(vec)
np.var(vec)
np.size(vec)
np.exp(vec)
np.log(vec)

Booleans (Python's logicals)

Python uses True and False. It uses the same comparison 
operators as R

Python

vec = np.array([2, 3, 5, 1])
vec

vec > 3
vec < 3
vec == 3
vec != 3
vec <= 3
vec >= 3


The logical operators are: Key Difference:
  "Not" uses a different character.

& And
| Or
~ Not

Python

np.array([True, True, False, False])& np.array([True, False, True, False])
np.array([True, True, False, False]) | np.array([True, False, True, False])
~np.array([True, True, False, False])

You subset a vector using Booleans as you would in R

Python

vec[vec <= 3]

vec[vec >3]


When you are dealing with single logicals, instead of arrays
of logicals, use and, or, and not instead

Python

True and False

True or False

not True

Exercise: Consider two vectors
y=(1,7,1,2,8,2) x=(4,6,2,7,8,2)
Calculate their inner product:
  y1x1+y2x2+y3x3+y4x4+y5x5+y6x6
Do this using vectorized operations.

# Solution

y = np.array([1,7,1,2,8,2])
x = np.array([4,6,2,7,8,2])

y*x

sum(y*x)



# Python Overview
In R I Want 	In Python I Use
Base R 	          numpy
dplyr/tidyr 	    pandas
ggplot2 	        matplotlib/seaborn


#  Pandas versus Tidyverse

These are the equivalencies you should have in mind.

<DataFrame>.fun() means that fun() is
a method of the <DataFrame> object.

<Series>.fun() means that fun() is
a method of the <Series> object.



tidyverse 	        pandas
arrange() 	       <DataFrame>.sort_values()
bind_rows() 	     pandas.concat()
filter() 	         <DataFrame>.query()
gather() 
and pivot_longer() 	<DataFrame>.melt()

glimpse() 	      <DataFrame>.info() and
<DataFrame>.head()
group_by() 	      <DataFrame>.groupby()
if_else()        	numpy.where()
left_join() 	    pandas.merge()
library() 	      import
mutate() 	        <DataFrame>.eval() and 
<DataFrame>.assign()
read_csv() 	      pandas.read_csv()
recode() 	       <DataFrame>.replace()
rename() 	       <DataFrame>.rename()
select() 	       <DataFrame>.filter() and 
<DataFrame>.drop()
separate() 	     <Series>.str.split()
slice() 	       <DataFrame>.iloc()
spread() and 
pivot_wider() 	 <DataFrame>.pivot_table().reset_index()
summarize() 	   <DataFrame>.agg()
unite() 	       <Series>.str.cat()
%>% 	           Enclose pipeline in ()

Importing libraries

Python: import <package> as <alias>.

Python

import numpy as np
import pandas as pd


Reading in and Printing Data

We'll demonstrate most methods with the "estate" data 
that we've seen before: https://data-science-master.github.io/lectures/data/estate.csv

You can read about these data here:
  https://data-science-master.github.io/lectures/data.html

Python: pd.read_csv(). There is a family of reading 
functions in pandas (fixed width files, e.g.).
Use tab-completion to scroll through them.

Python

estate = pd.read_csv("pythonexcelfile.csv")
estate

R equivalent:
  
  R

estate <- read_csv("pythonexcelfile.csv")

Use the info() and head() methods to get a view of
the data.

Python

estate.info()
estate.head()

R equivalent:
  
  R

glimpse(estate)



Extract Variables

Python: Use a period. This extracts the column as a Pandas Series.

Python

estate.Price

Then you can use all of those numpy functions on 
the Series

Python

np.mean(estate.Price)
np.max(estate.Price)

R equivalent: Use a $:
  
  R

estate$Price


Filtering/Arranging Rows (Observations)

Filter rows based on booleans (logicals) with query(). 
The queries need to be in quotes.

Python

estate.query('(Price > 300000) & (Area < 2500)')

You can also use bracket notation, which is more similar 
to base R

Python

estate[(estate.Price > 300000) & (estate.Area < 2500)]

R equivalent:
  
  R

filter(estate, Price > 300000, Area < 2500)

Select rows by numerical indices with iloc()

Python

estate.iloc[[1, 4, 10]]

R equivalent:
  
  R

slice(estate, 1, 4, 10)

Arrange rows by sort_values().

Python

estate.sort_values(by="Price", ascending=False)


R equivalent

R

arrange(estate, desc(Price))

# //////////////////////////////

Selecting Columns (Variables)

Variables are selected using filter().

Python

estate.filter(["Price"])

estate.filter(["Price", "Area"])

You can also use bracket notation, which is more similar 
to Base R.

Python

estate[["Price"]]

estate[["Price", "Area"]]

The inner brackets [] just creates a Python list. The 
outer brackets [] says that we are subsetting the 
columns.

R equivalent:
  
  R

select(estate, Price)
select(estate, Price, Area)
# ///////////////////////////////////////////////////

Dropping a column is done by drop(). The axis=1 argument says 
to drop by columns (rather than by "index", which is
                    something we haven't covered).

Python

estate.drop(["Price", "Area"], axis=1)

R: just use select() with a minus sign.

R

select(estate, -Price, -Area)

# ///////////////////////////////////////////////

Renaming variables is done with rename().

Python

estate

estate.rename({'Price': 'price', 'Area': 'area'},
              axis = 'columns')

R equivalence:
  
  R

rename(estate, price = Price, area = Area)


# ///////////////////////////////////////////////////

Creating New Variables (Mutate)

New variables are created in Python using eval(). 
Note that we need to place the expression in quotes.

Python

estate.eval('age = 2013 - Year')


R equivalent:
  
  R

mutate(estate, age = 2013 - Year)

# ////////////////////////////////////////////////////////////


Piping

All of these pandas functions return DataFrames. So, we can
apply methods to these DataFrames by just appending methods
to the end.

E.g., suppose we want to find the total number of beds/baths
and only select the price and this total number to print. 
Then the following code would work.

Python

estate.eval('tot = Bed + Bath').filter(["Price", "tot"])

If you want to place these operations on different lines, 
then just place the whole operation within parentheses.

Python

(
  estate.eval('tot = Bed + Bath')
  .filter(["Price", "tot"])
)

This looks similar to piping in the tidyverse

R

estate %>%
  mutate(tot = Bed + Bath) %>%
  select(Price, tot)

# /////////////////////////////////////////////////////////

Group Summaries

Summaries can be calculated by the agg() method. You usually 
first select the columns whose summaries you want before 
running agg().

# Let's find the means for Price and Area

Python

(
  estate.filter(["Price", "Area"])
  .agg(np.mean)
)

R equivalent

R

summarize(estate, Price = mean(Price), Area = mean(Area))


# ///////////////////////////////////////////////////////////

Recoding

Use replace() with a dict object to recode variable values.

estate

Python

estate.replace({'AC' : {0: "No AC", 1: "AC"}})

R equivalent:
  
  R

estate %>%
  mutate(AC = recode(AC,
                     "0" = "No AC",
                     "1" = "AC"))



Extra Resources

There is so much more to Python than what is presenting here.
Here are some resources if you want to learn more:
  
  Python Data Science Handbook

Python for Data Analysis

Another Book on Data Science


# Data Visuals using Python


In R I Want 	In Python I Use
Base R           	numpy
dplyr/tidyr     	pandas
ggplot2 	      matplotlib/seaborn
Import Matplotlib and Seaborn, and Load Dataset  


import matplotlib.pyplot as plt
import seaborn as sns
mpg = r.mpg



Show and clear plots.

Use plt.show() to display a plot.

Use plt.clf() to clear a figure when making a new plot.

# //////////////////////////////////////////////////////////

# Let's create a histogram using python

sns.histplot(x='hwy', data=mpg)
plt.show()

# Let's create a scatter plot using python
sns.histplot(x='hwy', data=mpg)
plt.clf()

sns.scatterplot(x='displ', y='hwy', data=mpg)
plt.show()


# Let's create box plots using python

sns.scatterplot(x='displ', y='hwy', data=mpg)
plt.clf()

sns.boxplot(x='class', y='hwy', data=mpg)
plt.show()

sns.boxplot(x='class', y='hwy', data=mpg)
plt.clf()

sns.scatterplot(x='displ', y='hwy', hue='class', data=mpg)
plt.show()


# Let's create a scatterplot with a regression line
# Lines/Smoothers

Use sns.regplot() to make a scatterplot with a regression line or
a loess smoother.

Regression line with 95% Confidence interval

sns.scatterplot(x='displ', y='hwy', hue='class', data=mpg)
plt.clf()

sns.regplot(x='displ', y='hwy', data=mpg)
plt.show()


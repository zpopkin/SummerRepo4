


x <- c(1, 4, 6, 2)
x

r.x


u = [8, 9, 11, 3]

py$u


import numpy as np

x = 10
x


x * 2
x + 2
x / 2
x - 2
x ** 2 # square
x % 2 # remainder


# This is a comment


x = ["hello", 1, True]
x


vec = np.array([2, 3, 5, 1])
vec


vec + 2
vec - 2
vec * 2
vec / 2
2 / vec

x = np.array([1, 2, 3, 4])
y = np.array([5, 6, 7, 8])
x + y
x - y
x / y
x * y
x ** y

vec[0]
vec[3]
vec[0:2]
vec[0:3]


x = np.array([1, 2, 3, 4])
y = np.array([5, 6, 7, 8])
np.concatenate([x, y])



vec = np.array([2, 3, 5, 1])
vec

np.sort(vec)
np.min(vec)
np.max(vec)
np.mean(vec)
np.sum(vec)
np.var(vec)
np.size(vec)
np.exp(vec)
np.log(vec)


vec > 3
vec < 3
vec == 3
vec != 3
vec <= 3
vec >= 3

vec[vec <= 3]


import numpy as np
import pandas as pd


estate = pd.read_csv("estatedata.csv")
estate


estate.info()

estate.head()


estate.Price

np.mean(estate.Price)
np.max(estate.Price)


estate.Area


np.mean(estate.Area)
np.max(estate.Area)



estate.query('(Price > 300000) & (Area < 2500)')

#or

estate[(estate.Price > 300000) & (estate.Area < 2500)]


# Specific rows can be selected by using iloc

estate.iloc[[1, 4, 10]]

# the R equivalent is  slice(estate, 1, 4, 10)

# Rows in Python can be arranbged by the command  sort_values()

estate.sort_values(by="Price", ascending=False)

# the equivalent code in R is arrange(estate, desc(Price))

# Selecting Columns (Variables)  Variables are selected by using the 
# command filter
estate.filter(["Price"])
estate.filter(["Price", "Area"])

# or by using brackets
estate[["Price"]]
estate[["Price", "Area"]]

# R equivalent coding is as follows
# select(estate, Price)
# select(estate, Price, Area)

# estate%>%
  # select(Price, Area)


# Dropping a column is done by drop(). The axis=1 argument says to drop 
# by columns 

estate.drop(["Price", "Area"], axis=1)

# In R, we would do the following to get the same output.
#  select(estate, -Price, -Area)


# Renaming variables in Python is done with rename().

estate.rename({'Price': 'price', 'Area': 'area'}, axis = 'columns')

# Equivalent coding in R is rename(estate, price = Price, area = Area)


# New variables are created in Python using eval(). Note that we
# need to place the expression in quotes.

estate.eval('age = 2013 - Year')

# You can use assign(), but then you need to reference the DataFrame as you
# extract variables:
estate.assign(age = 2013 - estate.Year)

# Equivalent R coding is mutate(estate, age = 2013 - Year)

# Piping

# All of these pandas functions return DataFrames. So, we can apply methods
# to these DataFrames by just appending methods to the end.

# E.g., suppose we want to find the total number of beds/baths and only select the price and this total number to print. Then the following code would work.

#Python

    estate.eval('tot = Bed + Bath').filter(["Price", "tot"])

 # If you want to place these operations on different lines, then just place the
 # whole operation within parentheses.

# Python

    (
    estate.eval('tot = Bed + Bath')
      .filter(["Price", "tot"])
    )

# This looks similar to piping in the tidyverse

# R tidyverse equivalent
    # estate %>%
      # mutate(tot = Bed + Bath) %>%
      # select(Price, tot)


# Group Summaries

    # Summaries can be calculated by the agg() method. You usually first select
    # the columns whose summaries you want before running agg().

   # Python

    (
    estate.filter(["Price", "Area"])
      .agg(np.mean)
    )

# R equivalent


# summarize(estate, Price = mean(Price), Area = mean(Area))


# Use groupby() to create group summaries.

# Python

(
estate.filter(["Price", "Area", "Bed", "Bath"])
  .groupby(["Bed", "Bath"])
  .agg(np.mean)
)

#R equivalent


# estate %>%
  # group_by(Bed, Bath) %>%
 #  summarize(Price = mean(Price), Area = mean(Area))
 
 
# You can get multiple summaries out by passing a list of functions:

Python

(
estate.filter(["Price", "Area", "Quality"])
  .groupby("Quality")
  .agg([np.mean, np.var])
)


# Recoding

   # Use replace() with a dict object to recode variable values.

   # Python cidubg

    estate.replace({'AC' : {0: "No AC", 1: "AC"}})

   # R equivalent:

    # estate %>%
     #  mutate(AC = recode(AC,
                        # "0" = "No AC",
                        # "1" = "AC"))

# To recode values based on logical conditions, use np.where().

# Python

estate.assign(isbig = np.where(estate.Price > 300000, "expensive", "cheap"))


# R equivalence:

# mutate(estate, isbig = if_else(Price > 300000, "expensive", "cheap"))


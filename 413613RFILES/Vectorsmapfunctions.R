
# Vectors / Iteration with purr / map functions    Chapters 16 and 17
library(tidyverse)
library(dplyr)


# What is a Vector ?

# In physics and mathematics a vector is a quantity or phenomenon 
# that has two independent properties; magnitude and direction. Our 
# definition or description however is considerably less technical.
# For the purposes of this class, a vector is simply a collection
# "things" or objects.  Those "things" can be numbers, words, letters, 
# or other miscellaneous items.

# Vectors are of two types:
#   Atomic Vectors
#   Lists
# Examples of Atomic Vectors (the objects are of the same type)

V1 <- c(12, 33, 2, 82, 33)  # All objects are integers

V2 <- c(.002, 3.6, 7.32, 4.5, 6.0) # All objects are doubles

V3 <- c(FALSE, TRUE, TRUE, FALSE)  # All objects are logical entries

V4 <- C("JANE", "BILL", "JUAN", "EILEEN", "ANN") # All objects are
# character strings

# Examples of Lists (objects can be of different types)

L1 <- list(6, 3.8, "every", TRUE)

L2 <- list(TRUE, 12, .0125, "cat", list(2:5)) # note that a list can
# contain another list


# There are six types of Atomic Vectors: logical, integer, double,
# character, complex, and raw.  Integer and double vectors are
# commonly referred to as numeric vectors.

# An Atomic Vector is homogeneous. (the items in the vector are
# of the same type)

# The following are examples of Atomic Vectors.

# X <- c("Raymond","Twenty", "Boston", "Eastern")  All items in the
# vector are character strings

# Y <- c(121, 128, 89, 11, 56 )  All items in the  vector are
# integers

# A List is heterogeneous. A List therefore can contain items of
# different types. (and other lists)
# A <- list( 36, "big". TRUE, list(2,"two", FALSE) ),

# Finding the type and length of a Vector.

typeof(c(11,15,20.5,37))

length(c(11,15,20.5,37))

AA <- (c("apple", "grape", "peach", "plum", "banana"))

typeof(AA)

length(AA)

# Finding the length of a List

M <- list("ALICE", 2:12, TRUE, 95)
M

length(M)

# Naming or describing the content of a vector. use the code set_names from the
# purr package.

set_names(c("Boston","Baltimore","Atlanta", "New York","Cleveland"))
set_names(c(14,12,.003,6,20))

set_names(5:7, c("m", "n", "p"))

# Subsetting Vectors

X <- c("Boston","Baltimore","Atlanta", "New York","Cleveland")
X

# Extract the first string of the vector
X[1]

# Extract the second and fourth strings of the vector
X[c(2,4)]

# Extract the second string of the vector three times

X[c(2,2,2)]

# Drop a string from the vector. (Let's drop the string New York)
X[-4]


# Another example

U <- c(10, 3, NA, 5, 8, 1, NA)
U

# Extract all missing values from the vector

U[is.na(U)]

# Extract all values from the vector that are not missing

U[!is.na(U)]

# Extract all values from the vector that are even (Extract only 10
# and 8)
U[U %%2 == 0 & !is.na(U)]

# Extract all values from the vector that are greater than 2 and the
# missing values
U[U > 2]

# Practice !!
#1  The following subsetting code will extract What elements ?
U[!(U > 5) & !is.na(U)]



#2  What does the following code produce ?
U[]


# LISTS

# Recall that lists can contain a mix of objects

Y <- list("ball", 25, 12.25, FALSE, b = 1:5, c = list(-1, "west"))
Y

# Use the command  str  to categorize each object
str(Y)

# Subsetting on a List

# using [[ ]] to subset a single object

str(Y[[1]])   str(Y[[4]])   str(Y[[6]])    str(Y[['c']])

# Using $ to subset a single object
Y$c     

Y$b

# Lets extract the object "ball" using the $ sign

Y <- list(z = "ball", 25, 12.25, FALSE, b = 1:5, c = list(-1, "west"))
Y

Y$"ball"
Y$z




# Subsetting to get a list from a list  (Use  str[ ])

Y <- list("ball", 25, 12.25, FALSE, b = 1:5, c = list(-1, "west"))
Y

str(Y[1:3])

str(Y[5:6])

str(Y[ ])

# Using the purr package map functions.

# Example 1

# Lets consider the previously learned code and method for finding
# the mean of every column of mtcars

mtcars


mean(mtcars$mpg)
mean(mtcars$cyl)
mean(mtcars$disp)
mean(mtcars$hp)
mean(mtcars$drat)
mean(mtcars$wt)
mean(mtcars$qsec)
mean(mtcars$vs)
mean(mtcars$am)  # two more


# Lets use the special for loop
output2 <- vector("double", ncol(mtcars))  # 1. output
for (i in seq_along(mtcars)) {            # 2. sequence
  output2[[i]] <- mean(mtcars[[i]])      # 3. body
}
output2

# Now lets use one of the map functions to get the same results

map_dbl(mtcars, mean)

# Suppose we wanted to use a map function to get the standard deviation
# for each variable of the mtcars data table.

map_dbl(mtcars, sd)


# Lets round each result to the nearest hundredth

# method 1
map_dbl(mtcars, sd) -> X
X

round(X, digits = 2)

# method 2
round(map_dbl(mtcars, sd), digits = 2)


# What will the following code produce from the mtcars data table?

map_dbl(mtcars, max)



# Lets use the piping procedure to apply map functions

mtcars

# Find the mean of each column

mtcars %>%
  map_dbl(mean)


# Find the minimum of each column

mtcars %>%
  map_dbl(min)

# Lets modify the value of each column (Add 3 to each column )

mtcars

mtcars %>%
  map(~. + 3)


# Textbook example

# Lets find a linear model for each type of cylinder categories for 
#vehicles in the mtcars data set. (We will use weight to predict 
# miles per gallon)

# How many cylinder types are there ?
mtcars

factor(mtcars$cyl)


models <- mtcars %>%
  split(.$cyl) %>%
  map(~lm(mpg ~ wt, data = .))
models

# Now lets get more detailed information for each model.

models %>%
  map(summary) 

# Lets find a particular value of the summary:  We will find Rsquared

# method 1
models %>%
  map(summary) %>% 
  map_dbl(~.$r.squared)


# method 2
models %>%
  map(summary) %>% 
  map_dbl("r.squared")

# How can we find r (the correlation coefficient) for each model?
models %>%
  map(summary) %>% 
  map_dbl(~.$r.squared) -> models1
models1

# method 1
models1 -> xx
xx

xx^.5

# method 2
sqrt(models1)




q()
y

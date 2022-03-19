library(tidyverse)

# A continuation of the usage of map functions 
# map2() ,  pmap()

# The map functions map2() and  pmap() make it possible to iterate over
# multiple arguments simultaneously.

# map2(.x, .y, .f, ...)  a function is applied or iterated over two arguments
# simultaneously.  .x and .y are vectors of the same length

# Example 1

x <- list(12, 14, 15, 18, 19)
y <- list(8, 14, 20, 22, 30)

# Finding iterative sums
map2(x,y, ~ .x + .y) 

map2_dbl(x,y, ~ .x + .y) 
# or
map2_dbl(x,y,  `+`)

# Performing miscellaneous iterative calculations.

map2(x,y,  ~ 2*.x - .y)        


map2_dbl(x,y,  ~ 2*.x - .y)   


map2_dbl(x,y, ~log(.x) + log(.y))



x <- list(12, 14, 15, 18, 19)
y <- list(8, 14, 20, 22, 30)

# Obtaining summary values
map2_dbl(x,y, min)

map2_dbl(x,y, max)

map2_dbl(x,y, sum)

map2_dbl(x,y, diff) ? # does not work !!

# methods to find differences
  
map2_dbl(x,y,  ~.x - .y)

map2_dbl(x,y, ~.y - .x )


#iterate to find means

x <- list(12, 14, 15, 18, 19)
y <- list(8, 14, 20, 22, 30)


map2_dbl(x,y, mean)  # note that this construction does not work !!



# Let's create an expression to calculate a mean for two numeric values.

map2_dbl(x,y, ~ ((.x+.y)/2))


# prerequisite work:  investigation of the function rnorm.
rnorm(n, mu, sd)

rnorm(400,2,.5)->x
x

# Check !!
mean(x)
sd(x)

# If the mean and the standard deviation are not indicated, they are understood
# to be 0 and 1 respectively.

rnorm(400) -> k
k

mean(k)
sd(k)

# Another map2 application

mu <-list(5, 10, -3)
sigma <-list(1, 5, 10
             )

map2(mu, sigma, rnorm, n = 5)%>%
  str()

# pmap is a function  applied or iterated over multiple 
# arguments (more than two) simultaneously. Again, the vectors are of the same
# length.

# pmap(.l, .f, ...)

# Example 2

x <- list(12, 14, 15, 18, 19)
y <- list(8, 14, 20, 22, 30)
z <- list(10, 18, 28, 34, 40)

# Find iterative sums

pmap_dbl(list(x,y,z), sum)

# Iteratively find minimum values
pmap_dbl(list(x,y,z), min)


pmap_dbl(list(x,y,z), mean)   # again this coding strategy does not work for
# finding means iteratively accross the lists !!


# Alternative coding

# Find the means
pmap_dbl(list(x,y,z), function(first, second, third) (first + second + third)/3)

# Calculate a output for a specialized function
pmap_dbl(list(x,y,z), function(first, second, third) 2*first + second + third)


# Another application for pmap
# Using iterative code to write descriptions for observations of a data
# frame.

tribble( ~Student,  ~Gender, ~Age,
         "John",   "Male",    20,
         "Alice",  "Female",  24,
         "Juan",   "Male",    21,
         "Beth",   "Female",  19,
         "Denise", "Female",  22
         ) -> A
A

# Example 1
# The student John is a male who is 20 years old.

# Let us produce similar statements for all students in the table

A %>% 
  pmap_chr(~ str_glue("The student {..1} is a {..2} who is {..3} years old."))


# Example 2

A %>% 
  pmap_chr(~ str_glue("{..1} is a {..2} whose age is {..3}"))

# using pmap on data frames

tribble( ~mean, ~sd,  ~n,
        5,       1,   15,
        10,      5,   10,
        -3,      10,  20
        ) -> parameters
parameters

pmap(parameters, rnorm)



# While loops / nested loops


i <- 1
while (i < 6) {
  print(i)
  i = i+1
}


i <- 1
while (i^2 < 100) {
  print(i)
  i = i+1
}


# Write a for loop that uses the break command to end outputs values after 6 values
x <- 1:11
for (val in x) {
  if (val == 7){
    break
  }
  print(val)
}


# Write a for loop that uses the next command to skip over the output value of 3 and
# then continues the output sequence.

x <- 1:8
for (val in x) {
  if (val == 3){
    next
  }
  print(val)
}

# Nested Loops

# A nested loop is a loop within a loop. Sounds simple, but there are a 
# variety of ways you can create nested loops. Let's check some out and
# remember that proper indentation is key.

# Here is the general format of a nested loop:

# loop (condition) {
#   block of instructions
#   loop (condition) {
#     block of instructions
#   }
# }

# Nested Loop 1

for (k in 1:3) {
  for (l in 1:2) {
    print(paste("k =", k, "l = ", l))  # interpretation 1->1, 1->2, 2->1, 2->2, 3->1, 3->2
  }
}


# Nested Loop 2

for(i in 1:4)
{
  for(j in 1:4)  # Interpretation: 1*1, 1*2, 1*3, 1*4, 2*1, 2*2, 2*3,...4*1,4*2,4*3,4*4
  {
    print(i*j)
  }
}

# Nested Loop 3

num_vector<-c(1,2,3)
num_vector

alpha_vector<-c("a", "b", "c")
alpha_vector

for(num in num_vector) { # outer loop 
  print(num) 
  for(letter in alpha_vector) # inner loop
    print(letter)
}



# Nested loops to create a matrix
# Let's create a 4 by 4 matrix whose row and column entries are products.

#1

matrix1 = matrix(nrow=4, ncol=4) # create a 4 x 4 matrix (of 4 rows and 4 columns)
for(i in 1:nrow(matrix1))        #// Assigned a variable  'i' for each row
{
  for(j in 1:ncol(matrix1))      #// Assigned a variable  'j' for each column
  {
    matrix1[i,j] = i*j           #// calculating product of two indeces
  }
}
print(matrix1)

#2

# What are the characteristics of the matrix produced by the coding below?

z <- matrix( nrow = 3, ncol = 3)
for (m in 1:3) {
  for (n in 1:3) {
    z[m, n] <- -1*(m + n)
  }
}
print(z)



q()
y

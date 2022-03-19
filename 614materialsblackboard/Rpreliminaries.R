
# R Preiminaries

# 1 Raise 12 to the second power
12^2
12**2
# 2 Find the square root of 169.
169^.5
169**.5
sqrt(169)

# 3 Raise  1/8 to the third power
(1/8)**3         
(1/8)^3
(1/8)*(1/8)*(1/8)

# 4 Evaluate 6 times the difference between between the square of 5 and 3.
6*(5^2 - 3)

# 5 Evaluate log(1000)   (common log,  base 10)
log10(1000)   
log
# 6 Evaluate ln(1000)    (Natural log,  base e)
log(1000)  log


# 7 Write all integers 1 to 25 inclusive in ascending order

1:25

# 8 Write all integers 1 to 25 inclusive in descending order

25:1

# 9 Find the sum of all integers 1 to 25. 

sum(1:25)

# 10 Find the mean of all integers 1 to 25. 

mean(1:25)

# 11 Find the median of all integers 1 to 25. 

median(1:25)

# 12 Find the mean, median, and other statistical indicators

summary(1:25)

# 13 Round 7.2557 to the nearest tenth

round(7.2557, digits= 1)


# 14 Round 7.2557 to the nearest thousandths

round(7.2557, digits= 3)

# 15 Divide  16 by 8

16/8

# 16 Divide 1 by 7 and then round the answer t0 the nearest  hundredth (use one line of code)

round((1/7),  digits = 2)

# 17  Find the numerical approximation for pi.   (We should get  3.141593)

pi

#VECTOR  USAGE

# 18  Create a vector to find the mean of a set of numbers.  Find the mean of 17 , 6, 10, 12
x <- c(7,6,10,12)
x

mean(x)


# 19  Create a vector to find the median of a set of numbers.  Find the median of 17 , 6, 10, 12

x <- c(7,6,10,12)
x

median(x)


# 20   Create a vector to find the 1st and third quartiles value of a set of numbers.  
# Find the 1st and 3rd quartiles of the numbers 17 , 6, 10, 12

x <- c(7,6,10,12)
x

summary(x)


# Using R to write a function

# 21  Write a function  to find the area of a square.   ( A =  s^2)

A <- function(s)
{s^2
 return(s^2)
}
# Find the area of a square whose sides are 12 inches
  A(12)


#22  Write a function to find simple interest   (I = prt)
  
  I <- function(p,r,t)
  {p*r*t
    return(p*r*t)
  }
# Find simple interest if $200 is invested at 5% for 2 years.
  I(200,.05, 2)
  
  
#23  Use R code to write a function that calculate a weighted average if chapter exams account for 40% of your grade,
     # homework accounts for 30% of your grade,  classwork accounts for 10% of your grade, and the final exam
     # accounts for 20% of your grade.   (WA  = .40CE + .30HW  +  .10CW + .20FE)
WA <- function(CE,HW,CW,FE)
{.40*CE + .30*HW + .10*CW + .20*FE
  return(.40*CE + .30*HW + .10*CW + .20*FE)
}
# Now find the weighted if a student has a chapter exam average of 80, a homework average of 84, a classwork
# average of 76, and a final exam score of 78.
WA(80,84,76,78)

# STAT 614 only
#Using R to find statistical summary values and to create graphs and plots

x<- c(10,22,37,46,55,58,60)
x

y<-c(12,9,7.5,5,2,.5,.2)
y

plot(x,y)


hist(y)

boxplot(y)

summary(y)

barplot(y)

stem(x, scale = 2)

# Using R code to create a data frame.

# Example  Use R code to create the following data frame

#   Name Age Gender
#1  Bill  34  Male
#2  Anne  37  Female
#3 Frank  40  Male
#4  Mary  36  Female


# Solution

Name  <- c("Bill", "Anne", "Frank", "Mary")
Name
Age <- c(34, 37, 40, 36)
Age
Gender <- c("Male", "Female", "Male", "Female")
Gender

DF <- data.frame(Name, Age, Gender)
DF

# Finding statistical summaries and graphs for a variable of a data frame

#  Find the mean age of the data frame
mean(DF$Age)
#  Find the median age of the data frame
median(DF$Age)
#  Find  multiple statistical summary values for age
summary(DF$Age)

# Create a histogram for the variable AGE of the data frame.

hist(DF$Age)



q()
y

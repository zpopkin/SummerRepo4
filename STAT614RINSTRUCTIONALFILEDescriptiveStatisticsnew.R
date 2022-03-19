
# Chapter 3  Descriptive Statistics

# Histograms
x <- c(20,33,36,43,46,47,48,54,55,55,57,59,60)
x
hist(x)

# skewed left or skewed right ?

# mean < median ,  mean > median  or  mean = median

#Boxplots

boxplot(x)
# any outliers ?   yes    no

boxplot(x, horizontal = TRUE)

boxplot(x, horizontal = TRUE, col = c("blue"))

boxplot(x, horizontal = TRUE, col = c("blue"), main = "BOXPLOT")

boxplot(x, horizontal = TRUE, col = c("blue"), main = "BOXPLOT",
xlab = "pushups")

y <- c(4,16,16,18,17,19,20,21,23,23,24,26,28,33)
y
# Histograms

hist(y)
# skewed left or skewed right ?

# mean < median , mean > median  or  mean = median

hist(y,  col = c("red"))

hist(y,  col = c("red", "blue"))

# Boxplots

boxplot(y)

# any outliers ?   yes    no

boxplot(y, horizontal = TRUE)

z <- c(9,13,18,20,22,22,23,24,25,27,28,33,37)
z 

# Histogram

hist(z)

# skewed left , skewed right or normal ?

# mewn < median  ,  mean > median  or  mean = median

boxplot(z)

# any outliers ?   yes    no


# Quartiles, Percentiles, IQR


x <- c(20,33,36,43,46,47,48,54,55,55,57,59,60)
x

# Find the Min, Max, 1st Quartile, 3rd Quartile, and the 
# Median for data set x

summary(x)

boxplot(x)

# Find the range of the data set (Max - Min)
  range(x)
# Find the IQR  (Inter Quartile Range)   Q3 - Q1  
# Use IQR to summarize skewed data
  
  IQR(x)
  
# Find the standard deviation  (typical distance between 
# the mean and another data value of the set)
  sd(x)

# Scatter Plots  (Tidyverse Methods and Base R Methods)
# install.packages("tidyverse)
library(tidyverse)
  
mpg
?mpg
View(mpg)

# Scatter plots are generated to explore a relationship between
# two quantitative variables

#  Example 1 use the mpg data to create a scatter plot for the variables city mileage (cty) and
#  highway mileage (hwy)  Let cty be independent X  and let hwy y 
#  be dependent Y

#Old base R method

  plot(mpg$hwy ~ mpg$cty)
  
# Does a positive or a negative association exists between the variables hwy and cty?

# Tidyverse method
  ggplot(data = mpg) +
    geom_point(mapping = aes(x = cty, y = hwy))

  ggplot(data = mpg) +
    geom_point(mapping = aes(x = cty, y = hwy), color = "blue")
  
  ggplot(data = mpg) +
    geom_point(mapping = aes(x = cty, y = hwy), color = "blue") +
    ggtitle("hwy vs cty")
  
  ggplot(data = mpg) +
    geom_point(mapping = aes(x = cty, y = hwy), color = "blue") +
    ggtitle("hwy vs cty") +
    xlab("city mileage") +
    ylab("highway mileage")
  
  #  Example 2 use the diamonds data to create a scatter plot for 
  #  the variables carat and price. Let carat be independent and 
  #  let price be dependent.
  
  diamonds
  ?diamonds
  View(diamonds)
  
  
  # Old base R method
  
    plot(diamonds$price ~ diamonds$carat)
  
 # Does a positive or a negative association exists between the variables hwy and cty?
  
  # Tidyberse method
    
    ggplot(data = diamonds) +
      geom_point(mapping = aes(x = carat, y = price))
    
  # Change the color of the data points and and a title
    
    ggplot(data = diamonds) +
      geom_point(mapping = aes(x = carat, y = price), color = "orange") +
      ggtitle("Diamonds Plot Carat vs Price")
    
    # Review of Basic Statistics
    
    library(tidyverse)
    install.packages("Sleuth3")
    library(Sleuth3)
    library(broom)
    
    
    # Let's generate a normal curve
    
    x <- seq(-4, 4, length=1000)
    y <- dnorm(x, mean=0, sd=1)
    plot(x, y, type="l", lwd= 2)
    
    
    # 1 Find the height of the normal curve for an x value of -2
    
    dnorm(x = -2, mean = 0, sd = 1) # the function dnorm produces the height of the
    # the normal curve at a specified value.
    
    # note that the symmetric property of the normal curve will give the same
    # answer for an x value of 2.
    
    dnorm(x = 2, mean = 0, sd = 1)
    
    # 2 The rnorm function will randomly produce a specified number of normally distri-
    # buted values that are randomly selected, given a mean and a standard deviation.
    
    rnorm(n = 550, mean = 1, sd = 1) 
    
    rnorm(n = 200, mean = 3, sd = 2.75)
    
    # 3 The pnorm function will produce the area under the normal curve that is to the
    # left of a given value.  This area is also a probability designation.
    
    pnorm(q = 2, mean = 1, sd = 1)
    
    # 3a For a normal distribution with a mean of 40 and a standard deviation of 5,
    #    Find the area under the curve that is less than or equal to 43.
    pnorm(q = 43, mean = 40, sd = 5)
    
    # 3b Test scores are normally distributed with a mean of 70 and a standard
    # deviation of 4.75. Find the probability that a student will score above 79 on
    # the test.
    pnorm(q = 79, mean = 70, sd = 4.75) # this will give the probability of getting a
    # score that is below 79.
    
    # Now subtract your answer from 1
    
    1 - 0.9709364
    
    # 3c Test scores are normally distributed with a mean of 70 and a standard
    # deviation of 4.75. Find the probability that a student will score between 65 and
    # 85 on the test.
    
    #  Step 1  Find the probability for getting less than the upper bound
    pnorm(q = 85, mean = 70, sd = 4.75)     # 0.9992054
    
    #  Step 2  Find the probability for getting less than the lower bound
    pnorm(q = 65, mean = 70, sd = 4.75)    # 0.1462549
    
    #  Step 3  Subtract!!  Step 1 answer -  Step 2 answer  0.9992054 - 0.1462549
    
    0.9992054 - 0.1462549
    
    
    # 4 qnorm is called the quantile function. Given a mean and a standard deviation,
    # it will give a value that an indicated probability (area) is to the left of.
    qnorm(p = 0.8413, mean = 60, sd = 5)
    
    #4a  Test scores are normally distributed with a mean of 75 and a standard 
    # deviation of 3.25. 65% of the scores are less than what score?
    qnorm(p = 0.65, mean = 75, sd = 3.25)
    
    #4b  Test scores are normally distributed with a mean of 75 and a standard 
    # deviation of 3.25. 65% of the scores are greater than what score?
    qnorm(p = 0.35, mean = 75, sd = 3.25)
    
    
    
  q()
  y
  
 
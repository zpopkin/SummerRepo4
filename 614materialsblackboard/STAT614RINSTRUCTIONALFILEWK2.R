
# Chapter 3  Descriptive Statistics

# Histograms
x <- c(20,33,36,43,46,47,48,54,55,55,57,59,60)
x
hist(x)

# skewed left or skewed right ?

# mewn < median ,  mean > median  or  mean = median

#Boxplots

boxplot(x)
# any outliers ?   yes    no

boxplot(x, horizontal = TRUE)

boxplot(x, horizontal = TRUE, col = c("blue"))

boxplot(x, horizontal = TRUE, col = c("blue"), main = "BOXPLOT")

boxplot(x, horizontal = TRUE, col = c("blue"), main = "BOXPLOT", xlab = "pushups")

y <- c(4,16,16,18,17,19,20,21,23,23,24,26,28,33)
y
# Histograms

hist(y)
# skewed left or skewed right ?

# mewn < median , mean > median  or  mean = median

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

# Find the Min, Max, 1st Quartile, 3rd Quartile, and the Median for data set x

summary(x)

boxplot(x)

# Find the range of the data set (Max - Min)
  range(x)
# Find the IQR  (Inter Quartile Range)   Q3 - Q1  Use IQR to summarize skewed data
  
  IQR(x)
  
# Find the standard deviation  (typical distance between the mean and another data value of the set)
  sd(x)

# Scatter Plots  (Tidyverse Methods and Base R Methods)

library(tidyverse)
  
mpg
?mpg
View(mpg)

# Scatter plots are generated to explore a relationship between two quantitative variables

#  Example 1 use the mpg data to create a scatter plot for the variables city mileage (cty) and
#  highway mileage (hwy)  Let cty be independent X  and let hwy be dependent Y

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
  
  #  Example 2 use the diamonds data to create a scatter plot for the variables carat and price
  #  Let carat be independent and let price be dependent.
  
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
    
    
  q()
  y
  
 
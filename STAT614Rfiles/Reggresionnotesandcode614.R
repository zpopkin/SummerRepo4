
library(tidyverse)
library(dplyr)
# STAT 614
# Linear Regression Basics and Preliminaries  Chapter 9  

# Linear regression is a process that attempts to model the relationship between two variables by
# fitting a linear equation (= a straight line) to the observed data. ... If you have a hunch that
# the data follows a straight line trend, linear regression can give you quick and reasonably accurate
# results.

# The process of linear regression helps us to explore the possibility of a linear relationship
# existing between two quantitative variables.

# A linear regression model will have two variables:  an independent variable (normally designated
# as x), and a dependent variable(normally designated as y).  Typically, the Regression model has
# the following form:   y = b + ax.  
#    a is the slope of the linear model
#    b is the y intercept.

# General Linear Regression Models

#   POPULATION                                               SAMPLE

#   E(Y) = ??O + ??1X +  ??             y = b + ax   y = bo + b1x + ??    E(y) = bo + b1x + ??


  

#  Consider the table of values in the table below:


              tribble(~ClubheadSpeadmphx,  ~Distanceydy,
                                  100 ,             257,
                                  102 ,             264,
                                  103 ,             274,
                                  101 ,             266,
                                  105 ,             277,
                                  100 ,             263,
                                   99 ,             258,
                                  105 ,             275
                      )
# The equation below is the linear regression model that offers a linear relationship between Club
# Speed x and distance y.
#                                           y = -55.7966 + 3.1661x
#                                 slope = 3.1661, and the y intercept is -55.7966
# We can use our Regression model to make predictions for distance y, given a club speed x.

# Let's consider two strategies for using R to produce the Regression Equation;

# Method 1
  x<- c(100,102,103,101,105,100,99,105)
  y<- c(257,264,274,266,277,263,258,275)
  
  lm(y~x)
  
  
  lm(y~x)->xx
  xx
  summary(xx)
  
# Method 2
  tribble(~ClubheadSpeadmphx,  ~Distanceydy,
          100 ,             257,
          102 ,             264,
          103 ,             274,
          101 ,             266,
          105 ,             277,
          100 ,             263,
          99 ,              258,
          105 ,             275
  ) ->xxx
  xxx
  
  lm(xxx$Distanceydy ~  xxx$ClubheadSpeadmphx)
  
  
  lm(xxx$Distanceydy ~  xxx$ClubheadSpeadmphx)->xz
  xz
  
  summary(xz)
  
  

# Using the mpg data set, let's first determine if a linear relationship
# exists between city and hwy. Let cty be independent and let hwy be
# dependent.  We will make this determination by looking at a scatter
# plot.

# Scatter Plot (Tidyverse Method)
ggplot(data = mpg) +
  geom_point(mapping = aes(x = cty , y = hwy)) +
  ggtitle("Scatter Plot (hwy vs. cty)")

# Scatter Plot (Old Base R Method)

scatter.smooth(x=mpg$cty, y=mpg$hwy, main="Scatter Plot (hwy vs. cty")

# Both scatter plots indicate the same linear relationship.

# Let's find the correlation coefficient (the value that gives the
# strength and the direction of the scatter plot)

cor(mpg$hwy , mpg$cty)

# The output indicates that the  correlation coeffient is .9559159.
# A very strong positive correlation. (The closer to 1 or -1 the 
# better.)

# We now check boxplots for outliers. ( Too many extreme outiers have
# a negative impact on our regression equation's capacity to predict)

# Boxplots (Tidyverse Methods)
ggplot(data = mpg) +
  geom_boxplot(mapping = aes(y = cty))

ggplot(data = mpg) +
  geom_boxplot(mapping = aes(y = hwy))

# Boxplots (Old Base R Methods)

boxplot(mpg$hwy,main = "hwy" )
boxplot(mpg$cty, main = "cty")

# We now look at density plots or histograms to investigate the
# distributions of both variables.  (The closer to normal the bettor)

# Histograms (Tidyverse Methods)

ggplot(data = mpg) +
  geom_histogram(mapping = aes(x = cty))
ggplot(data = mpg) +
  geom_histogram(mapping = aes(x = hwy))

#  Histograms (Old Base R Methods)
hist(mpg$cty)
hist(mpg$hwy)

# The histograms are not quite normal and the boxplots do show some
# outliers, but the scatter plot does show a strong linear relation-
# ship between city and highway mileage.  Hence we will generate the
# regression equation.  

lm(hwy ~ cty, data=mpg)


#  Let's use R coding to graph the scatter plot and the Regression Line

ggplot(data = mpg) +
  geom_point(mapping = aes(x = cty , y = hwy)) +
  geom_smooth(method = lm,mapping = aes(x = cty , y = hwy), se=FALSE)+
  ggtitle("Scatter Plot (hwy vs. cty)")



# Hence the regression equation is ;

#  hwy = .892 + 1.337cty

# We will use this equation to predict highway mileage based on a 
# given city mileage value.

# How should you interpret the slope ?
# Answer:  For every increase of one mile per gallon for city
# driving, highway driving increases by 1.33 miles per gallon.

# Finding a Residual
# By definition, a residual is found by subracting the expected
# value from the observed value. If the residual is a positive
# number the observed value is above average. If the residual is a
# negative number the observed value is below average.

# Example
mpg

# For the mpg data set, find the residual for the observational 
# cty value of 29.

mpg%>%
  filter(cty == 29)
# Step 1: Find the observed value (in the table) for 29. In the
# table a cty value of 29 corresponds to a hwy value of 41.
# Step 2: Find the expected (or fitted value) for 29. Put 29 into
# your equation.    Expected value = .892 + 1.337(29) = 39.665
# Step 3: Now find the residual by subtracting. (Observed - Expected)  41-39.665 = 1.335
# Step 4: Since the residual is a positive number, the value of 29
# is above average.

# We now look at output that is more comprehensive and informative
# regarding the regression analysis

lm(hwy ~ cty, data=mpg) -> x
x

summary(x)


# Note that the p value for the cty coefficient is well below .05,
# hence we can reject the null hypothesis that its coefficient is
# equal to 0.  You cannot reject the null hypothesis that the inter-
# cept is equal to 0 for its p value is higher than .05.  Also, take
# note of the t values.  High t values are good. Low t values are 
# bad. There is a high t value for the coefficient for cty, so we are
# confident that it is significantly different from 0. But that is
# not the case for the intercept.

# How much of the variation in hwy is explained by our model ?  That
# is what the Multiple R-squared value tells us.  Our model explains
# 91.38% of the variation in hwy.  That is pretty good.


# Another Example:

# We will investigate the relationship between the quantitative variables Age and 
# Total Cholesterol by using the collected sample data below.

Agex <-c(25,25,28,32,32,32,38,42,48,51,51,58,62,65)
Agex
TCy <-c(180,195,186,180,210,197,239,183,204,221,243,208,228,269)
TCy
# We will check the scatter plot
scatter.smooth(TCy~Agex)

#  Create a data table (get a better looking scatterplot)
tribble(~TCy,      ~Agex,
          25,       180,
          25,       195,
          28,       186,
          32,       180,
          32,       210,
          32,       197,
          38,       239,
          42,       183,
          48,       204,
          51,       221,
          51,       243,
          58,       208,
          62,       228,
          65,       269
          ) ->  aa
aa

# Produce a tidyverse scatter plot


ggplot(data = aa) +
  geom_point(mapping = aes(x = Agex , y = TCy)) +
  geom_smooth(method = lm,mapping = aes(x = Agex , y = TCy), se=FALSE)
  

# Now produce the model

lm(TCy~Agex) -> zz
zz

summary(zz)

# y(hat) = 151.3537 + 1.3991X


sqrt(.5153)
residuals(z)


tribble(~pointspergamey,    ~hoursofpracticeperweekx,
        48,                     6,
        57,                     7.5,
        63,                      8,
        71,                     8.75,
        77,                     9.2,
        83,                     10,
        87,                     10.6,
        93,                     11.4,
        93,                     11.8,
        98,                     12.45
        ) -> S
S

ggplot(data = S) +
  geom_point(mapping = aes(x = hoursofpracticeperweekx , y = pointspergamey))+
  geom_smooth(method = lm, mapping = aes(x = hoursofpracticeperweekx , y = pointspergamey))

lm(S) -> I
I

summary(I)


q()
y

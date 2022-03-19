
library(tidyverse)

# Linear Regression (Continued)  Multiple Regression (An Introduction)

#Example 1  (A perfect Fit!!)

S<-c(5, 10, 15, 20, 25, 30, 35, 40, 45, 50)
S  # (Dependent or Response)
U<-c(60,57,54,51,48,45,42,39,36,33)
U  #(Independent or Explanatory)

# Let's examine the scatter plot

plot(S~U)

# Lets find the correlation coefficient  (r or R)
cor(S,U)  

# Wow !!  Perfect correlation !!

# Now let's produce a linear model

lm(S~U)->k
k

summary(k)

# The linear regression model is:  S =  1.05000 - 1.667U

# Let's  graph the regression line through the data points
scatter.smooth(S~U)

# Let's examine the output.

# Why is the Residual standard error nearly 0 ?

# What is the typical distance between a sampled slope estimate and the true slope from the 
# population ?

# Interpret the Multiple R-squared value.

# Should the null hypothesis that the Population slope equals zero be rejected ?

# Is the relationship between the response variable and explanatory variable of the population
# dependent or independent.

# Example 2  Textbook Problem

# The prediction equation relating the  x = years of education and y = annual income in dollars
# is  y(hat) = -20,000 +  4000x, and the correlation = .50.  The standard deviations were 2.0 for
# x and 16,000 for y.

#   a) Interpret the slope

#   b) For a correlation of .50, do you expect a strong or weak linear pattern shown by the 
#      scatter plot?

#   c) Find the proportion of the variability in y that is explained by the linear regression 
#      model. What proportion of the variability is due to other factors or chance?

#   d) Show how to find the correlation from the slope.

#       r = b(s(x)/s(y))

# Example 3

tribble(~Home,  ~SellingPrice,  ~Size,  ~Taxes,  ~Bedrooms,   ~Bathrooms,  ~New,
           1,       279900,      2048,    3104,       4,          2,       "No",
           2,       146500,       912,    1173,       2,          1,       "No",
           3,       237700,      1654,    3076,       4,          2,       "No",
           4,       200000,      2068,    1608,       3,          2,       "No",
           5,       159900,      1477,    1454,       3,          3,       "No",
           6,       499900,      3153,    2997,       3,          2,       "Yes",
           7,       265500,      1355,    4054,       3,          2,       "No",
           8,       289900,      2075,    3002,       3,          2,       "Yes"
        )-> Homes
Homes

# Let's examine the scatter plot

ggplot(data = Homes) +
  geom_point(mapping = aes(y = SellingPrice,  x = Size)) +
  geom_smooth(method = lm, mapping =  aes(y = SellingPrice,  x = Size), se = FALSE)

# Based on the scatter plot how would you rate the linear pattern of the data points?
#   poor   moderate   strong    very strong ?

# Check the boxplots for outliers

boxplot(Homes$SellingPrice)
boxplot(Homes$Size)

# Check the qq plots for normality
qqnorm(Homes$SellingPrice)
qqnorm(Homes$Size)

# Let's produce the linear regression model and look at important summary measures

lm(Homes$SellingPrice~Homes$Size)

lm(Homes$SellingPrice~Homes$Size)-> xx
xx
summary(xx)
cor(Homes$SellingPrice,Homes$Size)


# Find the 95% confidence interval of the population slope. 

qt(p=.025, df=6, lower.tail = FALSE)

#   b +/-  t(se)
#   145.23 +/- 2.446912(32.35)  =  145.23 +/-  79.1576
#   145.23 - 79.1576 = 66.0724
#   145.23 + 79.1576 = 224.3876

# LB 66.0724        UB 224.3876 

# Interpretation: We are 95% confident that the true population slope falls between 66.0724 and
# 224.3876

# Let's find the correlation coefficient  (r or  R)
cor.test(Homes$SellingPrice,Homes$Size)



# INTRODUCTION TO MULTIPLE REGRESSION  (Usage of two or more independent variables)

tribble(~SellingPrice,  ~Size,  ~Taxes,  ~Bedrooms,    
               279900,      2048,    3104,       4,                 
               146500,       912,    1173,       2,                 
               237700,      1654,    3076,       4,                 
               200000,      2068,    1608,       3,                 
               159900,      1477,    1454,       3,                 
               499900,      3153,    2997,       3,                 
               265500,      1355,    4054,       3,                 
               289900,      2075,    3002,       3,                 
)-> Homes1
Homes1

# Produce a full multiregression model, using all independent 
# variables  (Selling price is the dependent variable)


lm(SellingPrice ~ Size + Taxes + Bedrooms ,  
   Homes1) -> x
x

# Proposed Multiple Regression Model

# Selling Price = 33411.84 + 136.55(Size) +  52.33(Taxes)  +  -50882.64  

summary(x)

# Is the overall model significant ?  Why or Why not.

cor(Homes1)

# Is there a problem with multicollinearity among the independent variables? (Explanatory or
# independent variables that are highly correlated with one another; the predicting power of
# the model does not improve if there is high correlation between independent variables)


# Which independent variables should be eliminated from your model If any?

lm(SellingPrice ~ Size, Homes1)-> gg
gg

summary(gg)


# Classwork data table

tribble(~Height,   ~Weight,  ~HeadCircumference,
        30,         339,           47,
        26.25,      267,           42,
        25,         289,           43,
        27,         332,           44.5,
        27.5,       272,           44,
        24.5,       214,           40.5,
        27.75,      311,           44,
        25,         259,           41.5,
        28,         298,           46,
        27.25,      288,           44,
        26,         277,           44,
        27.25,      292,           44.5,
        27,         302,           42.5,
        28.25,      336,           44.5
        
) -> W
W


q()
y


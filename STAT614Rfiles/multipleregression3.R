# Multiple Linear Regression Interaction

library(tidyverse)

tribble(~milestraveled,  ~numdeliveries,       ~gasprice,         ~traveltime,
        89,                    4,                 3.84,               7,
        66,                    1,                 3.19,              5.4,
        78,                    3,                 3.78,              6.6,
        111,                   6,                 3.89,              7.4,
        44,                    1,                 3.57,              4.8,
        77,                    3,                 3.57,              6.4,
        80,                    3,                 3.03,               7,
        66,                    2,                 3.51,              5.6,
        109,                   5,                 3.54,              7.3,
        76,                    3,                 3.25,              6.4
        ) -> K
K



# An analysis of a full regression model  

#  Produce the full regression model for the data table K.  (traveltime is the response variable)

lm(traveltime~milestraveled + numdeliveries + gasprice, K)
        

# The full multiple regression model is:
#  traveltime  =  0.01412milestraveled + 0.38315numdeliveries - 0.60655gasprice  

# Interpret the coefficient for the explanatory variable milestraveled.
#      If the variables numdeliveries and gasprice are held constant,  for every increase of 
#      1 mile the traveltime increases by 0.01412 minutes.


# Find a 95% confidence interval for the coefficient of the numdeliveries variable

lm(traveltime~milestraveled + numdeliveries + gasprice, K)-> AA
AA
summary(AA)

#    #   b +/-  t(se)

#     b = .38315,  df = n - (k+1) = 10 - (3+1) = 6,  se = 0.30006

#  Find t
qt(p=.025, df=6, lower.tail = FALSE)


#   .38315 +/- 2.446912(0.30006)  =  .38315 +/- .73422 
#   .38315 - .73422 = -0.35107
#   .38315 + .73422 =  1.11737

# LB -0.35107        UB 1.11737

# Interpretation: We are 95% confident that the true population coefficient for numdeliveries
# falls between  -0.35107 and 1.11737

cor(K)

# Are there issue of multicollinearity among any independent variables ?


# Is the dependent variable correlated with all independent variables ?

summary(AA)
# Which coefficients are significant at the level of .05 ?

#  Interpret the Residual standard error
#         On average, the data points are .3447 units away from the regression line.

#  Interpret the standard error for numdeliveries
#      The standard error for numdeliveries is .30006.  This is the typical distance between
#      a sampled numdeliveries coefficient and the true population numdeliveries coefficient

#  Interpret the table value .8947
#         This is the Multiple R-squared; Your model explains 89.47% of the variation in 
#         the dependent variable traveltime.

#  Interpret the table value .842
#         This is the Adjusted R-squared: Your model explains 84.2% of the variation in
#         the dependent variable traveltime using only those independent variables that 
#         have an impact on the dependent variable


#  Should the null hypothesis that the numdeliveries explanatory variable coefficient is
#  equal to zero be rejected ?

#         No, because the p value is .2488 which is greater than .05.


#  Should the null hypothesis that all of the population explanatory variable coefficients
#  equal zero be rejected ?

#         Yes, because the p value of .002452 (at the very bottom of the summary table)
#         is less than .05.  Therefore, we embrace the alternative hypothesis that at 
#         at least one of the population explanatory coefficients is not equal to zero.
#         Therefore collectively the explanatory variables have a significant linear
#         relationship with the response variable.
#           

# Comparing Models

cor(K)

lm(traveltime~milestraveled, K)-> K1
K1
summary(K1)




lm(traveltime~numdeliveries, K)-> K2
summary(K2)





lm(traveltime~numdeliveries + milestraveled, K)-> K3  # collinarity problem
summary(K3)






lm(traveltime~numdeliveries + gasprice, K)-> K4
summary(K4)





lm(traveltime~milestraveled + gasprice, K)-> K5
summary(K5)






lm(traveltime~milestraveled + gasprice + numdeliveries, K)-> K6
summary(K6)







# Interaction terms

#  Interaction:An interaction occurs when an explanatory variable has a different effect 
#  on the outcome depending on the values of another explanatory variable.

tribble(  ~SellingPrice,     ~Size,  ~Taxes,  ~Bedrooms, ~Bathrooms,  
        279900,               2048,    3104,       4,          2,       
        146500,                912,    1173,       2,          1,       
        237700,               1654,    3076,       4,          2,      
        200000,               2068,    1608,       3,          2,       
        159900,               1477,    1454,       3,          3,       
        499900,               3153,    2997,       3,          2,       
        265500,               1355,    4054,       3,          2,       
        289900,               2075,    3002,       3,          2,       
)-> Homes
Homes

# Example
# Suppose we have a dependent variable  Selling Price and the two explanatory variables are  Size
# Size and Taxes.  A typical Multiple Linear Regression model is given below:

#          Selling Price = -70604.09 + 128.35Size + 36.74Taxes

# This is our model if Selling price is impacted by Size independent of values for Taxes or
# Selling Price is impacted by Taxes independent of values for Size. 

# If however Selling price is impacted by one of our explanatory variables, but the impact depends
# on different values for the other explanatory variable , we have interaction between the 
# explanatory variables.  For example suppose Selling Price is higher when Size is large and Taxes 
# are high, but Selling Price is lower when Size is large and Taxes are low.  

# If interaction exists we introduce another variable called an interaction term that is 
# formed by multiplying the two variables  Size * Taxes.  We consider adding this term to the
# model if the its coefficient is significant.


# Using the data table Homes we first produce summary out put for the standard multiple linear
# regression model involving Selling Price, Size and Taxes.

lm(SellingPrice~Size + Taxes, Homes)->UU
UU
summary(UU)

# Our proposed Multiple Linear Regression Model without the interaction term is:

#     Selling Price = -70604.09 + 128.35Size + 36.74Taxes

#  Suppose Size = 2995, and Taxes = 3

#  Selling Price = -70604.09 + 128.3*2995 + 36.74*3 =  313914.38   ( A reasonable answer given
#  (the values for the table))


# Using the data table Homes we first produce summary out put for the standard multiple linear
# regression model involving Selling Price, Size and Taxes and the interaction term 
# Size * Taxes

lm(SellingPrice~Size + Taxes + Size:Taxes, Homes)->uu
uu
summary(uu)

# Our proposed Multiple Linear Regression Model with the interaction term is:

#  Selling Price = 196800 - 65.24Size - 66.69Taxes + .07231(Size*Taxes) 

# Suppose Size = 2995, and Taxes = 3

# Our Selling Price = 196800 - 65.24*2995 - 66.69*3 + .07231(2995*3) = 1855.83

#  Analysis  

#  Our interaction term is significant, we have high R(squared) and aR(squared) values plus 
#  the overall model is significant but our test substitution gives an answer 
#  that makes no sense. Neither explanatory variable individually is significant.

#  It is not a good idea to include the interaction term in the model primarily because the
#  model is likely to produce answers that are not consistent with typical table results.


#  Classwork Data Table


tribble(~WorkExperience, ~LevelofEducation, ~AnnualIncomeThou,
        21,                      6,               31.7,
        14,                      3,               17.9,
        4,                       8,               22.7,
        16,                      8,               63.1,
        12,                      4,               33,
        20,                      4,               41.4,
        25,                      1,               20.7,
        8,                       3,               14.6,
        24,                      12,              97.3,
        28,                       9,              72.1,
        4,                       11,              49.1,
        15,                       4,              52
)->X
X





q()
y
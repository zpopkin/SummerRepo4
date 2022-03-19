
library(tidyverse)

#1 Use and show R code to import the VehicleData2 excel spread sheet.  Assign your imported data
#  the name  vd2

read_csv("VehicleData2.csv")->vd2
vd2

#2 Use and show R code to create a correlation matrix. The response variable is MilesperGallon.
# Is the response variable highly correlated with all explanatory variables? If not, indicate 
# which explanatory variables are not highly correlated with the response variable.
# For which pairs of explanatory variables is multicollinearity a problem?  
cor(vd2)

#3 Use and show R code to produce a multiple regression model for a response variable of 
# MilesperGallon and explanatory variables curbWeight and EngineSize.
# Indicate what the model is showing the intercept and the coefficients for both explanatory
# variables
lm(MilesperGallon ~ EngineSize + CurbWeight, data = vd2)

# Now use your model to predict Milespergallon if EngineSize is 3.65 and CurbWeight is 4000.
# (Show your work)

#4 Use and show R code to produce a summary table for the model that you have created.
lm(MilesperGallon ~ EngineSize + CurbWeight, data = vd2) -> modelvd2
modelvd2

summary(modelvd2)

#5 
# 5a) For this model, can you reject the null hypothesis that the population coefficient for
#     EngineSize is 0? Justify your answer.
# 5b) According to the summary table, what is the proportion of variablility in the response variable
#     is explained by the model using only explanatory variables that affect the response
#     variable?
# 5c) What is typical distance between a sampled coefficient for Curbweight and the population
#     coefficient for Curbweight?
# 5d) Find a 95% confidence interval for the EngineSize coefficient. (Show all steps and required R
#     code)

#6
# Add another variable to your model ; Cylinders. Create a summary table for you model that now has
# three explanatory variables.  Do you now have a model that does a better job predicting
# MilesperGallon?  Justify your answer

lm(MilesperGallon ~ EngineSize + CurbWeight + Cylinders, data = vd2) -> modelvd3
modelvd3
summary(modelvd3)

#7
# Now consider a regression model that only has one explanatory variable, EngineSize. Create a summary
# table for this model and compare the results to the previously developed model types with two and
# three explanatory variables.  Pick the best model to use for predicting MilesperGallon. Give a 
# detailed answer (6 or 7 sentences) using relavant information from each summary table.

#8 
#8a Use and show R code to import the excel spread sheet VehicleData. (This data table has a dummy or
# indicator variable)  Assign the data table the name vd

read_csv("VehicleData.csv")->vd
vd

#8b Use and show R code to develop a model produced to predict MilesperGallon using the variables
#   CurbWeight, EnginSize and ForiegnDomestic. Indicate the intercept and the coefficients for all
#   explanatory variables.

#8c For the categorical variable, let the level of Foriegn be assigned 1 and the level of Domestic be
#   assigned 0. Use your model to predict Milespergallon for a CurbWeight of 5000, an EngineSize of
#   3.7 and a vehicle that is Domestic.

lm(MilesperGallon ~ CurbWeight + EngineSize + ForiegnDomestic, data = vd) -> modelvd
modelvd
#as.factor(vd$ForiegnDomestic) -> vd$ForiegnDomestic
#contrasts(vd$ForiegnDomestic)
summary(modelvd)


#9 Explain in detail the difference between One Way Anova and Two Way Anova (6 or 7 sentences).

# One Way ANOVA: responses are subject to different levels of one factor.
# Two way ANOVA: 

#10
#a
tribble(~Gender,   ~Agerange,   ~timeminutes,
          "Male",     "20to34",         5.2,
          "Male",     "20to34",         5.1,
          "Male",     "20to34",         5.7,
          "Male",     "20to34",         6.1,
          "Male",      "35to49",        4.8,
          "Male",      "35to49",        5.8,
          "Male",      "35to49",        5.0,
          "Male",      "35to49",        4.8,
          "Male",      "50to64",        5.2,
          "Male",      "50to64",        4.3,
          "Male",      "50to64",        5.5,
          "Male",      "50to64",        4.7,
          "Female",    "20to34",        5.3,
          "Female",    "20to34",        5.5,
          "Female",    "20to34",        4.9,
          "Female",    "20to34",        5.6,
          "Female",    "35to49",        5.0,
          "Female",    "35to49",        5.4,
          "Female",    "35to49",        5.6,
          "Female",    "35to49",        5.1,
          "Female",    "50to64",        4.9, 
          "Female",    "50to64",        5.5,
          "Female",    "50to64",        5.5,
          "Female",    "50to64",        5.0,
        ) -> XX
XX

#b
as.factor(XX$Gender) -> XX$Gender

as.factor(XX$Agerange) -> XX$Agerange
str(XX)

#c
aov(timeminutes~Gender + Agerange + Gender:Agerange, data = XX) ->XXmodel
XXmodel
summary(XXmodel)

#d  interaction: the impact of one explanatory variable depends on the level being applied of the 
#   other explanatory variable.

#e  No

#f
interaction.plot(XX$Agerange, XX$Gender, XX$timeminutes, xlab = "Agerange",
                 ylab = "timeminutes")

# weak to moderate interaction



q()
y

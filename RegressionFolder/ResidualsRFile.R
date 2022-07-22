
library(tidyverse)
library(dplyr)

# R coding for Residuals and Residual Plots


mtcars

mtcars%>%
  select(hp,wt) -> mtcars4
mtcars4

as_tibble(mtcars4) -> mtcars4tibble
mtcars4tibble

lm(hp~wt, mtcars4tibble)

mtcars4tibble%>%
  mutate(yhat = -1.821 + 46.160*wt)%>%
  mutate(residuals = hp -(-1.821 + 46.160*wt))-> mtcars4tibble1
mtcars4tibble1


mean(mtcars4tibble1$residuals)

ggplot(data = mtcars4tibble1) +
      geom_point(mapping = aes(y = residuals, x = wt))

qqnorm(mtcars4tibble1$residuals)









iris


plot(iris$Sepal.Length ~ iris$Sepal.Width)

# No definitive linear relationship is shown between the two variables.

# Now lets generate a linear model for depth vs x.

lm(Sepal.Length~Sepal.Width , data = iris) -> model6
model6

# Finding the residuals for the model

resid(model6) -> residuals
residuals

# We will now plot the residuals against the fitted values.

plot(fitted(model6), residuals)

# Normality Check for the residuals (qqplot)

qqnorm(residuals)

hist(residuals)
boxplot(residuals)



#add a horizontal line at 0
abline(0,0)



mtcars

# Lets generate a scatter plot for hp vs wt and investigate a possible
# linear relationship between the variables.

plot(mtcars$hp ~ mtcars$wt)

# The scatter plot does suggest a positive linear relationship


# Now lets generate a linear model for depth vs x.

lm(mtcars$hp ~ mtcars$wt) ->  modelz
modelz
     
#        or

lm(hp ~ wt, data = mtcars) -> modelz
modelz

# Finding the residuals for the model

resid(modelz) -> residuals
residuals

# We will now plot the residuals against the fitted values.
plot(fitted(modelz), residuals)

abline(50,0)

# The residual plot shows no distinct pattern, hence a strong case
# for linearity of the regression function.



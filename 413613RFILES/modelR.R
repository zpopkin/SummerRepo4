
# A study and analysis of models (Chapter 18)

library(tidyverse)
library(purrr)
library(modelr)
library(dplyr)
options(na.action = na.warn) # this codes produces warnings and messages 
                             # regarding missing values.

# The goal of a model is to provide a simple low-dimensional summary of a dataset.
# In the context of this book we're going to use models to partition data into 
# patterns and residuals. Strong patterns will hide subtler trends, 
# so we'll use models to help peel back layers of structure as we explore a 
# dataset.

# However, before we can start using models on interesting, real, datasets, 
# you need to understand the basics of how models work. For that reason, this 
# chapter of the book is unique because it uses only simulated datasets. 
# These datasets are very simple, and not at all interesting, but they will 
# help you understand the essence of modeling before you apply the same 
# techniques to real data in the next chapter.

# There are two parts to a model:
  
# 1.  First, you define a family of models that express a precise, but generic, 
# pattern that you want to capture. For example, the pattern might be a straight 
# line, or a quadratic curve. You will express the model family as an equation 
# like y = a_1 * x + a_2 or y = a_1 * x ^ a_2. Here, x and y are known variables 
# from your data, and a_1 and a_2 are parameters that can vary to capture
# different patterns.

# 2.  Next, you generate a fitted model by finding the model from the family 
# that is the closest to your data. This takes the generic model family and  
# makes it specific, like y = 3 * x + 7 or y = 9 * x ^ 2.

# y = a_1 * x + a_2  ->  y = 3 * x + 7
#   general form         specific form

# Previously taught model creation and investigation.  (Linear model)
# 614 or 302
# Step 1 Start with a data table
mpg

# Step 2 Select two variables to investigate:  cty and hwy

# Step 3 Investigate the scatter plot (check for a linear pattern)

ggplot(data = mpg)+
  geom_point(mapping = aes(x = hwy, y = cty))

# Step 4  plot the regression line (line of best fit)

ggplot(data = mpg)+
  geom_point(mapping = aes(x = hwy, y = cty)) +
  geom_smooth(method = lm, mapping =aes(x = hwy, y = cty))

# Step 5  Find the equation of the line of best fit.

lm(mpg$cty ~ mpg$hwy, data = mpg)  # this code will produce the intercept
#                                    and the slope

# y = 0.8442 + 0.6832hwy  

# Step 6 use the summary function to get more details regarding the model
summary(lm(mpg$cty ~ mpg$hwy, data = mpg))


# Model creation for simulated data sets

# scatter plot for the simulated data sim1

ggplot(sim1, aes(x,y)) +
  geom_point()


ggplot(sim1, aes(x,y)) +
  geom_point(color = "red")



# Lets generate models using different values for slope and y 
# intercept

# the runif function randomly selects values that are between a given
# maximum and minimum

models <- tibble(
  a1 = runif(250, -20, 40),  # possible intercept values
  a2 = runif(250, -5, 5)     # possible slope values
)

ggplot(sim1,aes(x, y)) +
  geom_abline(aes(intercept = a1, slope = a2),
              data = models, alpha = 1/4) +
  geom_point()

# It is obvious that some of the models are bad


# Let's find individual predictions by the model for an intercept of 7
# and a slope of 1.5

model1 <- function(a, data) {
  a[1] + data$x *a[2]    # 30 possible values for x
}

model1(c(7,1.5), sim1)


# Let's find the root mean squared deviation. (intercept 7 slope 1.5)
# the root mean squared deviation is a summary value that indicates an
# overall distance between observation points and predictor values. You 
# can think of it as the summary residual for all residuals.


measure_distance <- function(mod, data)  {
  diff <- data$y - model1(mod, data)
  sqrt(mean(diff ^ 2))
}
measure_distance(c(7,1.5), sim1)  # generally how close are the points to 
# model for which the intercept is 7 ad the slope is 1.5


# Let's find the root mean squared deviation for all possible intercept and 
# slope pairings.  
sim1_dist <- function(a1, a2) {
  measure_distance(c(a1, a2), sim1)
}

models <- models %>%
  mutate(dist = purrr::map2_dbl(a1,a2,sim1_dist))
models

# Now lets take a look at the best 10 model lines for the data

ggplot(sim1, aes(x,y)) +
  geom_point(size = 2, color = 'grey30') +
  geom_abline(
    aes(intercept = a1, slope = a2, color = -dist),
    data = filter(models, rank(dist)<= 10)
  )

# Let's find and plot the best model line

best <- optim(c(0,0), measure_distance, data = sim1)
best$par

ggplot(sim1, aes(x,y)) +
  geom_point(size = 2, color = "red") +
  geom_abline(intercept = best$par[1] , slope = best$par[2])


# Now, using another approach lets find the intercept and the slope 
# of the best model.

sim1_mod <- lm(y~x, data =sim1)
coef(sim1_mod)


# Lets generate the Predictions

grid <- sim1 %>%
  data_grid(x)
grid

grid <- grid%>%
  add_predictions(sim1_mod)  # these are the points that are on the line.
grid

# Lets plot the predictions  We are actually graphing the line of best fit 
# thru the data points

ggplot(sim1, aes(x)) +
  geom_point(aes(y=y)) +
  geom_line( aes(y = pred),
  data = grid, color = "red", size =1
  )

# Residuals  (Remember that Residual = Observed - Predicted)

tribble(~x,  ~y,
        1,   5.1,
        2,   13.7,
        3,   12.1,
        4,   17.4,
        5,   21.2,
        6,   NA
        ) -> DF1
DF1

ggplot(data = DF1) +
  geom_point(mapping = aes(y =y, x = x)) +
  geom_smooth(method = lm, mapping = aes(y = y, x = x), se = FALSE) 


# Default behavior is to silently drop missing values
m1 <- lm(y ~ x, data = DF1)
resid(m1)

# Use na.action = na.warn to give a warning about missing values
m2 <- lm(y ~ x, data = DF1, na.action = na.warn)
resid(m2)



# Residuals for sim1


# Lets look at the plot again

ggplot(sim1, aes(x,y)) +
  geom_point(size = 2, color = "red") +
  geom_abline(intercept = best$par[1] , slope = best$par[2])


# Now lets generate residuals for sim1
sim1 <- sim1%>%
  add_residuals(sim1_mod)
sim1

# generating models for categorical data

sim2   # a modeler data set that has a categorical variable. 


sim2%>%
  print(n =40)


ggplot(sim2) +
  geom_point(aes(x,y)) 

# Lets fit a model and generate predictions

mod2 <- lm(y ~ x, data = sim2)

grid <- sim2 %>%
  data_grid(x) %>%
  add_predictions(mod2)
grid

# Now lets plot the predictions  on top of the original data.

ggplot(sim2 , aes(x)) +
  geom_point(aes(y = y)) +
  geom_point(
    data = grid,
    aes(y = pred),
    color = "purple",
    size = 4
  )
  
# A categorical predictor and a continuous predictor.  sim3

sim3   # x1 is quantitative and x2 is categorical


ggplot(sim3, aes(x1, y)) +
  geom_point(aes(color = x2))


# two possible models
mod1 <- lm(y ~ x1 + x2, data = sim3)  # no interaction for x1 and x2
mod2 <- lm(y ~ x1*x2, data = sim3)   # interaction for x1 and x2


# Lets create a grid that shows predictions for both models, considering all
# possible variable combinations
grid1 <- sim3 %>%
  data_grid(x1,x2) %>%
  gather_predictions(mod1, mod2)
grid1

as.data.frame(grid1)

# Now lets visualize the results for both models using a facet plot

ggplot(sim3, aes(x1, y, color =x2)) +
  geom_point() +
  geom_line(data = grid1, aes(y = pred)) +
  facet_wrap(~model)

# We now compare models by looking at residual plots

sim3 <- sim3 %>%
  gather_residuals(mod1, mod2)

ggplot(sim3, aes(x1, resid, color = x2)) +
geom_point() +
facet_grid(model ~ x2)


q()
y


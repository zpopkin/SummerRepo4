
library(tidyverse)
library(modelr)
library(gapminder)
library(dplyr)
library(splines)
options(na.action=na.warn)
sim1
ggplot(sim1, aes(x,y)) +
  geom_point()


ggplot(data=sim1) + 
  geom_point(mapping = aes(x=x, y=y)) +
  geom_smooth(method=lm, mapping=aes(x=x,y=y), se=FALSE) 


sim1_mod <- lm(y~x, data = sim1)
  coef(sim1_mod)
  
  
  model_matrix(mtcars, mpg ~ cyl) -> nod
  mod
  
  gg

ggplot(sim2)  +
  geom_point(aes(x,y))

lm(y~x, data=sim2)->m2
m2

summary(m2)
install.packages("hexbin")
library(hexbin)
ggplot(diamonds, aes(carat, price)) +
  geom_hex(bins=30)

ggplot(data = diamonds) +
  geom_hex(mapping = aes(x = carat, y = price))

?options(na.action = na.warn)

?model_matrix

?model_matrix

sim2
str(sim2)

?na.action()
na.w


?as.factor
ggplot(date=sim2) +
  geom_point(mapping = aes(x=as.factor(sim2$x),y=y))

ggplot(sim2) +
  geom_point(aes(x,y))

mod2 <- lm(y~x, data = sim2)
mod2

grid <- sim2 %>%
  data_grid(x) %>%
  add_predictions(mod2)
grid


ggplot(sim2) +
  geom_point(aes(x,y)) +
  geom_point(aes(grid, pred),
             color = "red",
             size=4
             
  )


ggplot(sim2, aes(x)) +
  geom_point(aes(y=y)) +
  geom_point(
    data = grid,
    aes(y=pred),
    color = "red",
    size=4
  )


sim1

ggplot(data = sim1) +
  geom_point(mapping = aes(x=x, y=y))


?sim3


ggplot(sim3, aes(x1, y)) +
  geom_point(aes(color = x2))


mod1 <- lm(y~ x1 + x2, data = sim3)
mod1

mod2 <- lm(y~ x1*x2, data = sim3)
mod2

grid <- sim3 %>%
  data_grid(x1, x2) %>%
  gather_predictions(mod1, mod2)
grid


ggplot(sim3, aes(x1, y, color = x2)) +
  geom_point() +
  geom_line(data = grid, aes( y = pred)) + 
  facet_wrap(~model)

sim3 <- sim3%>%
  gather_residuals(mod1, mod2)

ggplot(sim3, aes(x1, resid, color = x2)) +
  geom_point() +
  facet_grid(model ~ x2)


df <- tribble(
  ~y, ~x,
  1,   1,
  2,   2,
  3,   3,
)
df

model_matrix(df, y ~x^2 + x)


model_matrix(df, y ~I(x^2) + x)

model_matrix(df, y ~ ns(x, 2))

model

?ns
?poly


sim5  <- tibble(x=
  seq(0,3.5*pi, length =50),
  y = 4*sin(x) +rnorm(length(x))
)
sim5

ggplot(sim5, aes(x,y)) +
  geom_point()

gapminder


gapminder%>%
  ggplot(aes(year, lifeExp, group = country)) +
  geom_line(alpha = 1/3)



nz <- filter(gapminder, country ==  "New Zealand")
nz
nz %>%
  ggplot(aes(year, lifeExp)) +
  geom_line() +
  ggtitle("Full data = ")

nz_mod <- lm(lifeExp ~ year , data = nz)
nz_mod

nz %>%
  add_predictions(nz_mod) %>%
  ggplot(aes(year, pred)) +
  geom_line() +
  ggtitle("Linear Trend + ")


nz %>%
  add_residuals(nz_mod) %>%
  ggplot(aes(year, resid)) +
  geom_hline(yintercept = 0, color = "blue", size = 1) +
  geom_line() +
  ggtitle("Remaining Pattern ")

by_country <- gapminder %>%
  group_by(country, continent) %>%
  nest()
by_country

by_country$data[[1]]


q()
y
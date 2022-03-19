install.packages("gapminder")

library(tidyverse)
library(broom)
library(gapminder)
data("gapminder")
glimpse(gapminder)

gapminder


gapminder %>%
  ggplot(aes(x = year, y = lifeExp, group = country)) +
  geom_line(alpha = 1/3) +
  xlab("Year") +
  ylab("Life Expectancy")


gapminder %>%
  filter(country == "United States") ->
  usdf

ggplot(usdf, aes(x = year, y = lifeExp)) +
  geom_line() +
  geom_smooth(method = "lm", se = FALSE) +
  geom_line(alpha = 1/3) +
  xlab("Year") +
  ylab("Life Expectancy")


us_lmout <- lm(lifeExp ~ year, data = usdf)
tidy_uslm <- tidy(us_lmout)
tidy_uslm

summary(us_lmout)

gapminder %>%
  mutate(logpop = log2(pop)) ->
  gapminder

gapminder

gapminder %>%
  ggplot(aes(x = year, y = pop, group = country)) +
  geom_line(alpha = 1/3) +
  xlab("Year") +
  ylab("Population") +
  scale_y_log10()

gapminder %>%
  filter(country == "China") ->
  china_df

gapminder %>%
  filter(country == "China") ->
  china_df

## some curvature caused by non-independence of years.
china_df %>%
  ggplot(aes(x = year, y = logpop)) +
  geom_point() +
  geom_smooth(se = FALSE, method = "lm")

china_lm <- lm(logpop ~ year, data = china_df)
china_lm

summary(china_lm)

gapminder %>%
  group_by(country, continent) %>%
  nest() ->
  nested_gap_df

nested_gap_df

nested_gap_df$data[[1]]
nested_gap_df$data[[2]]

nested_gap_df %>%
  mutate(lmout = map(data, ~lm(lifeExp ~ year, data = .))) ->
  nested_gap_df
nested_gap_df
nested_gap_df$lmout[[1]]

q()
y
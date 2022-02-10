library(tidyverse)

iris

ggplot(iris, aes(x = Sepal.Length)) + 
geom_freqpoly(bins = 15, color = "blue", 
              size = 0.8)

ggplot(data = iris) +
  geom_freqpoly(mapping = aes(x = Sepal.Length),
  bins = 30, color = "purple", size = .9)
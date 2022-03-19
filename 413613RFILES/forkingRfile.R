
library(tidyverse)
library(ggplot)

mpg

ggplot(data=mpg) +
  geom_point(mapping = aes(x=cty, y=hwy)) +
  xlab("city") +
  ylab("highway") + 
  ggtitle("milespergallon") +
  geom_smooth(method=lm, mapping=aes(x=cty,y=hwy), se = FALSE, color = "red") 

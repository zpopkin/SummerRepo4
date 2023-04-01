library(tidyverse)
library(ggplot2)
library(dplyr)
mpg
# My name is Zach Popkin and Samuel Mweni
# This is my coding that generates Boxplots for transmission types
# The data source is the mpg data table
ggplot(data = mpg) +
  geom_boxplot(mapping = aes(x = drv, y = displ, fill = drv)) +
  ggtitle("Boxplots (mpg data : transmission types vs displacement)") +
  xlab("transmission types") +
  ylab("displacement") +
coord_flip()
  



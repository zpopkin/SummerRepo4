
library(dplyr)
library(tidyverse)
library(dplyr)
install.packages("ggrepel")
library(ggrepel)

ggplot(mpg,aes(displ,hwy)) +
  geom_point(aes(color = class)) +
  geom_smooth(se = FALSE)+  
  labs(
    title = "Fuel efficiency generally decreases with engine size")




#This works

ggplot(mpg,aes(displ,hwy)) +
  geom_point(aes(color = class)) +
  geom_smooth(se = FALSE)+  
  labs(
    title = "Fuel efficiency generally decreases with engine size", 
    subtitle = "Two seaters (sport cars) are an exception due to their weight",
    caption = "Data from fueleconomy.gov",
    x = "engine displacement",
    y = "Higway fuel economy (mpg)",
    color = "car type")

?runif

df <- tibble(
  x = runif(10),
  y = runif(10)
)
df
mpg

best_in_class <- mpg %>%
  group_by(class)%>%
  filter(row_number(desc(hwy)) == 1)
best_in_class

 ggplot(mpg, aes(displ,hwy)) +
   geom_point(aes(color=class)) +
   geom_text(aes(label = model), data = best_in_class,
   nudge_y = 2,
   alpha = .5
   )
 
 
 ggplot(mpg, aes(displ,hwy)) +
   geom_point(aes(color=class)) +
   geom_label(aes(label = model), data = best_in_class,
             nudge_y = 2,
             alpha = .5
   )

 
 ggplot(mpg, aes(displ,hwy)) +
   geom_point(aes(color=class)) +
   geom_point(size = 3, shape = 1, data = best_in_class) +
   ggrepel::geom_label_repel(
     aes(label = model), data = best_in_class
   )
   
 
 class_avg <- mpg %>%
   group_by(class) %>%
   summarize(displ = median(displ),
             hwy = median(hwy)
             )
 class_avg
 
 ggplot(mpg, aes(displ,hwy, color = class)) +
   ggrepel::geom_label_repel(aes(label = class), 
   data = class_avg,
     label.size = 0,
     segment.color = NA
   ) +
   geom_point() +
   theme(legend.position = "none")
   
 
 label<- mpg %>%
   summarize(
     displ= max(displ),
     hwy = max(hwy),
     label =("Inreasing engine size is \nrelated to"
             "decreasing fuel economy."
      )
   )
  label
  
  
  ggplot(mpg, aes(displ, hwy)) +
    geom_point() +
    geom_text(
      aes(label = label),
      data = label,
      vjust = "top",
      hjust = "right"
    )
    
ggplot(mpg, aes(displ, hwy)) +
   geom_point(aes(color = class))


ggplot(mpg, aes(displ, hwy)) +
   geom_point(aes(color = class))  +
   scale_y_continuous(breaks = seq(15,40, by = 5)) +
   scale_x_continuous(breaks = seq(1,7 , by = .5))


ggplot(mpg, aes(displ, hwy)) +
   geom_point(aes(color = class))  +
   scale_y_continuous(labels = NULL) +
   scale_x_continuous(labels = NULL)

presidential

presidential %>%
   mutate(id = 33 + row_number()) %>%
   ggplot(aes(start, id)) +
   geom_point() +
   geom_segment(aes(xend = end, yend = id)) +
   scale_x_date(
      NULL,
      breaks = presidential$start,
      date_labels = "'%y"
   ) 

base <- ggplot(mpg, aes(displ, hwy)) +
   geom_point(aes(color = class))
base

base + theme(legend.position = "left")

base + theme(legend.position = "none")

ggplot(mpg, aes(displ, hwy)) +
   geom_point(aes(color = class)) +
   geom_smooth(se = FALSE) +
   theme(legend.position = "bottom") +
   guides(
      color = guide_legend(
         nrow = 1,
         override.aes = list(size = 4)
      )
   )
         
      
ggplot(diamonds, aes(carat, price)) +
   geom_bin2d()

ggplot(diamonds, aes(log10(carat),log10(price))) +
   geom_bin2d()

ggplot(diamonds, aes(carat, price)) +
   geom_bin2d() +
   scale_x_log10() +
   scale_y_log10()

ggplot(mpg, aes(displ,hwy)) +
   geom_point(aes(color = drv, shape = drv)) +
   scale_color_brewer(palette = "Set1")


presidential %>%
   mutate(id = 33 + row_number()) %>%
   ggplot(aes(start, id , color = party)) +
   geom_point() +
   geom_segment(aes(xend = end, yend = id)) +
   scale_colour_manual(
      values = c(Republican = "red",  Democratic = "blue")
   ) 


ggplot(mpg, mapping = aes(displ, hwy)) +
   geom_point(aes(color = class)) +
   geom_smooth() +
   coord_cartesian(xlim = c(5,7),  ylim = c(10, 30))



mpg%>%
   filter(displ >= 5, displ <= 7, hwy >= 10, hwy <= 30) %>%
   ggplot(aes(displ, hwy)) + 
   geom_point(aes(color = class)) +
   geom_smooth()


suv <- mpg%>%
   filter(class == "suv")
suv

ggplot(suv, aes(displ, hwy, color = drv)) +
   geom_point()


compact <- mpg%>%
   filter(class == "compact")
compact

ggplot(compact, aes(displ, hwy, color = drv)) +
   geom_point()


x_scale <- scale_x_continuous(limits = range(mpg$displ))
y_scale <- scale_y_continuous(limits = range(mpg$hwy))
col_scale <- scale_color_discrete(limits = unique(mpg$drv))

ggplot(suv, aes(displ, hwy, color = drv)) +
   geom_point() +
   x_scale +
   y_scale +
   col_scale

ggplot(compact, aes(displ, hwy, color = drv)) +
   geom_point() +
   x_scale +
   y_scale +
   col_scale




q()
y

    
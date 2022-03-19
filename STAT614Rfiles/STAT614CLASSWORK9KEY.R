library(tidyverse)

tribble(~Height,   ~Weight,  ~HeadCircumference,
          30,         339,           47,
          26.25,      267,           42,
          25,         289,           43,
          27,         332,           44.5,
          27.5,       272,           44,
          24.5,       214,           40.5,
          27.75,      311,           44,
          25,         259,           41.5,
          28,         298,           46,
          27.25,      288,           44,
          26,         277,           44,
          27.25,      292,           44.5,
          27,         302,           42.5,
          28.25,      336,           44.5
                  
          ) -> W
W

cor(W)

lm(HeadCircumference~Height + Weight, W ) -> sumW
sumW

summary(sumW)

lm(HeadCircumference~Height, W) -> ww
ww

summary(ww)

cor.test(W)



library(tidyverse)
df <- tibble(
  a = rnorm(10),
  b = rnorm(10),
  c = rnorm(10),
  d = rnorm(10)
)
df

output <- vector("double", ncol(df))  # 1. output
for (i in seq_along(df)) {            # 2. sequence
  output[[i]] <- median(df[[i]])      # 3. body
}
output

mtcars

output2 <- vector("double", ncol(mtcars))  # 1. output
for (i in seq_along(mtcars)) {            # 2. sequence
  output2[[i]] <- mean(mtcars[[i]])      # 3. body
}
output2



output3 <- vector("double", ncol(diamonds))  # 1. output
for (i in seq_along(diamonds)) {            # 2. sequence
  output3[[i]] <- typeof(diamonds[[i]])      # 3. body
}
output3
diamonds



#check

mean(mtcars$mpg)

tribble(~Name,  ~Weight,
        "Jonas",   122,
        "Bert",    194,
        "Karen",   122
        ) -> XX
XX

length(unique(XX$Weight))


output4 <- vector("double", ncol(XX))  # 1. output
for (i in seq_along(XX)) {            # 2. sequence
  output4[[i]] <- length(XX[[i]])      # 3. body
}
output4


summary(diamonds)
uniq
str(diamonds)
typeof(diamonds$color)
iris
as_tibble(iris)-> IT
IT
lengt

q()
y
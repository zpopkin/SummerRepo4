library(tidyverse)

# One Way ANOVA Example:  Review

SlimMilk<- c(857,853,865,904,916,886,854,856)
MixedMilk<-c(1006,991,1015,1035,1024,1013,1065,1002)
WholeMilk <-c(879,938,841,818,870,874,881,836)

CombindGroups <- data.frame(cbind(SlimMilk,MixedMilk,WholeMilk))
CombindGroups

# Step 3
StackedGroups <-stack(CombindGroups)
StackedGroups

# Step 4
aov(values~ind, data = StackedGroups) ->A
A
summary(A)

# Since the null hypothesis that all population means are equal has been rejected,
# lets determine what population groups have means that are significantly different.

TukeyHSD(A) # new

# We now further support our conclusion by looking at boxplots

boxplot(CombindGroups)

# Lets look at the data in a different format (We import the data from an external excel file)

read_csv("MilkData2.csv") -> MD
MD


aov(Calcium~Milk, data = MD) ->AA
AA
summary(AA)

TukeyHSD(AA)

# boxplot base R method

boxplot(MD$Calcium~MD$Milk)

# boxplot tidyverse method

ggplot(data=MD) +
  geom_boxplot(mapping = aes(x = Milk, y = Calcium))



# Two Way ANOVA

# Two Way ANOVA compares population means across categories of two explanatory variables. Each null
# hypothesis states that the population means are identical across categories of one categorical
# variable, controlling for the other one.

# Requirements to perform the the Two Way ANOVA
#     1. the populations are normal
#     2. the samples are independent
#     3. the populations have the same variance

# Hypothesis Testing for Two Way ANOVA
#   H(O): There is no interaction between the factors  H(A): There is interaction between factors
#   H(O): There is no effect of factor A   H(A): There is effect of factor A
#   H(O): There is no effect of factor B   H(B): There is effect of factor B

# We introduce another factor for the MilkData data.  The new factor is  Brand.


#                SkinMilk            MixedMilk               WholeMilk

#    BrandA     857 , 853            1006 , 991               879 , 938
#               865 , 904            1015 , 1035              841 , 818
#
#    BrandB     916 , 886            1024 , 1013              870 , 874
#               854 , 856            1065 , 1062              881 , 836

# We arrange or structure the data as follows for R input and analysis

tribble(~Brand,   ~MilkType,    ~Calcium,
          "BrandA",   "SkinMilk",   857,
          "BrandA",   "SkinMilk",   853,
          "BrandA",   "SkinMilk",   865,
          "BrandA",   "SkinMilk",   904,
          "BrandA",   "MixedMilk",  1006,
          "BrandA",   "MixedMilk",  991,
          "BrandA",   "MixedMilk",  1015,
          "BrandA",   "MixedMilk",  1035,
          "BrandA",   "WholeMilk",  879,
          "BrandA",   "WholeMilk",  938,
          "BrandA",   "WholeMilk",  841,
          "BrandA",   "WholeMilk",  818,
          "BrandB",   "SkinMilk",   916,
          "BrandB",   "SkinMilk",   886,
          "BrandB",   "SkinMilk",   854,
          "BrandB",   "SkinMilk",   856,
          "BrandB",   "MixedMilk",  1024,
          "BrandB",   "MixedMilk",  1013,
          "BrandB",   "MixedMilk",  1065,
          "BrandB",   "MixedMilk",  1002,
          "BrandB",   "WholeMilk", 870,
          "BrandB",   "WholeMilk", 874,
          "BrandB",   "WholeMilk", 881,
          "BrandB",   "WholeMilk", 836
          ) -> Milk
      Milk

      
      as.factor(Milk$Brand) -> Milk$Brand
      
      as.factor(Milk$MilkType) -> Milk$MilkType
      
      str(Milk)
    
      
      aov(Calcium ~ Brand + MilkType + Brand:MilkType, 
          data = Milk)-> aovMilk
      aovMilk
      summary(aovMilk)

      
      interaction.plot(Milk$Brand, Milk$MilkType, Milk$Calcium, xlab = "Brand",
                       ylab = "Calcium")
      
      
      
 



# Example 2

tribble(~Weight,    ~pH,   ~Calluna,
    2.76, "pH3.5", "Present",
    2.39, "pH3.5", "Present",
    3.54, "pH3.5", "Present",
    3.71, "pH3.5", "Present",
    2.49, "pH3.5", "Present",
    4.10, "pH3.5",  "Absent",
    2.72, "pH3.5",  "Absent",
    2.28, "pH3.5",  "Absent",
    4.43, "pH3.5",  "Absent",
   3.31,  "pH3.5",  "Absent",
   3.21, "pH5.5", "Present",
   4.10, "pH5.5", "Present",
   3.04, "pH5.5", "Present",
   4.13, "pH5.5", "Present",
   5.21, "pH5.5", "Present",
   5.92, "pH5.5", "Absent",
   7.31, "pH5.5",  "Absent",
   6.10, "pH5.5",  "Absent",
   5.25, "pH5.5",  "Absent",
   7.45, "pH5.5",  "Absent"
   
) ->festuca
festuca


as.factor(festuca$pH) -> festuca$pH
as.factor(festuca$Calluna) -> festuca$Calluna

str(festuca)


aov(Weight ~ pH + Calluna + pH:Calluna, 
    data = festuca)-> aovfestuca
aovfestuca
summary(aovfestuca)


interaction.plot(festuca$pH, festuca$Calluna, festuca$Weight, xlab = "ph",
ylab = "weight")


#  Example 3
warpbreaks



as.factor(warpbreaks$wool) -> warpbreaks$wool
as.factor(warpbreaks$tension) -> warpbreaks$tension

str(warpbreaks)


aov(breaks ~ wool + tension + wool:tension, data = warpbreaks) -> wp
wp

summary(wp)


interaction.plot(warpbreaks$wool, warpbreaks$tension, warpbreaks$breaks, xlab = "wool",
                 ylab = "breaks")



# Example 4
tribble( ~Gender,   ~Age,   ~Score,
         "boy",    "ten",     4,
         "boy",    "ten",     6,
         "boy",    "ten",     8,
         "girl",   "ten",     4,
         "girl",   "ten",     8,
         "girl",   "ten",     9,
         "boy",    "eleven",  6,
         "boy",    "eleven",  6,
         "boy",    "eleven",  9,
         "girl",   "eleven",  7,
         "girl",   "eleven",  10,
         "girl",   "eleven",  13,
         "boy",    "twelve",  8,
         "boy",    "twelve",  9,
         "boy",    "twelve",  13,
         "girl",   "twelve",  12,
         "girl",   "twelve",  14,
         "girl",   "twelve",  16 
      )-> V

V   

as.factor(V$Gender) -> V$Gender

as.factor(V$Age) -> V$Age
str(V)

aov(Score ~ Gender + Age + Gender:Age, data = V) ->aovV
aovV

summary(aovV)


interaction.plot(V$Gender, V$Age, V$Score, xlab = "Gender",
                 ylab = "Score")



#  Classwork

tribble(~genotype,  ~gender,  ~activity,
        "FF", "Female", 3.34,
        "FF", "Female", 4.72,
        "FF", "Female", 3.39,
        "FO", "Female", 4.05,
        "FO", "Female", 5.06,
        "FO", "Female", 3.59,
        "OO", "Female", 4.12,
        "OO", "Female", 3.58,
        "OO", "Female", 4.09,
        "FF", "Male", 2.20,
        "FF", "Male", 2.60,
        "FF", "Male", 5.26,
        "FO", "Male", 2.72,
        "FO",  "Male", 3.28,
        "FO",  "Male", 3.43,
        "OO",  "Male", 3.12,
        "OO",  "Male", 3.74,
        "OO",  "Male", 4.60
        
        ) -> ac
ac




# LOGISTIC REGRESSION  (Introduction)
#      * Used when the response variable is a binary categorical variable (1 or 0)
#      * Based on probability and odds (You will answer questions concerning probability or
#     odds)
#      * Formulas used for to process Logistic Regression
#      1) ln(P/(1 - P) =  B(0) + B(1)X(1) + B(2)X(2) + ... + B(k)X(k)
#      2) P =  (e^(B(0) + B(1)X(1) + B(2)X(2) + ... + B(k)X(k)) /
#              (1 + e^( B(0) + B(1)X(1) + B(2)X(2) + ... + B(k)X(k))

tribble(~EntranceExamScore,  ~GPA,   ~ADMIT,
            72,               3.2,       0,
            81,               3.4,       0,
            67,               2.7,       0,
            77,               2.8,       0,
            87,               3.3,       1,         
            79,               3.8,       1,
            85,               2.7,       0,
            76,               2.5,       0,
            90,               3.1,       1,
            77,               2.6,       0,
            64,               2.4,       0,
            70,               2.75,      0,
            88,               3.0,       1,
            79,               3.55,      0,
            72,               2.8,       0,
            80,               3.3,       1,
            80,               2.4,       0,
            76,               3.0,       0,
            76,               2.75,      0,
            89,               2.8,       1,
            93,               3.3,       1,
            88,               3.2,       1,
            83,               3.5,       0
        ) -> ps
ps


glm(ADMIT ~ EntranceExamScore + GPA, family = "binomial",  data = ps) -> logisticps
logisticps
    
summary(logisticps)
    
    
#   ln(P/(1 - P) = -59.1733 + .5536EntranceExamScore + 4.1010GPA  


# Example
#   Now use your model to find the probability that a student will be admitted if she has a 
#   GPA of 2.85 and an Entrance exam score of 83.

# ln(P/(1 - P) =   -59.1733 + .5536(83) + 4.1010(2.85)
# ln(P/(1 - P) = -1.53665
# e^(ln(P/(1 - P)) =e^(-1.53665)
#     P/(1 - P) = .2151005
# solve for P
#  P = .2151005(1 - P)
#  P =  .2151005 - .2151005P
#  1.2151005P = .2151005
#         P =  .2151005/ 1.2151005
#         P = .17538  (rounded to five digits)
# Hence the probability is approximately .18

# Find the odds that the student will be admitted.
# P/(1-P)  =  .18/.82 = 18/82 = 9/41 or 9 : 41 or 9 to 41

    
q()
y











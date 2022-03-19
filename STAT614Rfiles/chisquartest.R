



# Chisquare Test for Independence

# We will use the Chisquare Test for Independence in order to determine if two categorical variables are dependent 
# or independent.  For example, does Political Party Affiliation depend on Gender?  Does you Gender influence your
# status as being a Democrat or a Republican ?  Typically the null hypothesis is; the two categories are independent
# and the alternative hypothesis is; the categories are dependent.   We make a decision to reject or fail to reject
# the null hypothesis based on the size of the p value

# Example

# Is there a relationship between marital status and happiness? The data in the table below shows the marital
# status and happiness of individuals who participated in the General Social Survey.  

#                   Married       Widowed       Divorced/Separated        Never/Married
# Very Happy          600          63                 112                     144
# Pretty Happy        720          142                355                     459
# Not too Happy        93           51                119                     127


# You can choose one of the three methods given for usage of R to run  the Chi-Square Test.

# Method 1  (Using the matrix command, enter the data column by column and then indicate the number of rows
# needed.  use the chisq.test command to generate chi square output)  

z<-matrix(c(600,720,93,63,142,51,112,355,119,144,459,127),nrow = 3)
z

chisq.test(z)

# The output indicates that the p value is less than .05, hence we reject the null hypothesis and conclude that
# the categories Marital Status and Level of Happiness are dependent(they are related)


# Method 2  (Create a table and assign the table to an Input command as indicated below.  Assign the as.matrix
# command code a variable name and use the chisq.test to generate output.)  Note: if you do not have the most 
# current version of R and R studio, you may have problems using this method.

InputT <- ("
         Married  Widowed   DS     NM 
VH         600      63      112    144     
PH         720      142     355    459
NTH        93       51      119    127
")


MARRIEDHAPPYDATA <- as.matrix(read.table(textConnection(InputT),
                              header=TRUE,
                              row.names=1))
MARRIEDHAPPYDATA

chisq.test(MARRIEDHAPPYDATA)

# Method 3  (Again, apply the matrix command to a vector, but enter the data row by row instead of column by
# column.  The create the row names and column names as indicated in the code below.)

observed_table <- matrix(c(600,63,112,144,720,142,355,459,93,51,119,127), nrow = 3, ncol = 4, byrow = T)
colnames(observed_table) <- c("Married", "Widowed" , 'Divorced/Separated' ,  "NeverMarried")
rownames(observed_table) <- c("VeryHappy", "Prettyhappy", "NotToHappy")
observed_table

chisq.test(observed_table)

# I prefer method 3


# Of course you generate the Chisquare statistic by using the expected values.  
# You can also generate expected values by assigning a variable and then using the expected command as illustrated
# below.  

chisq.test(observed_table)-> EV
EV

EV$expected

# Find a p value given chisquare statistic and the degrees of freedom
1 - pchisq(224.12, 6)


# Example 2

# Lets use R to run the chi-square test for independence  for the problem in the video


# Method 1

x <- matrix(c(71,4992,154,2808,398,2732), nrow=2)
x

chisq.test(x)


# Method 2

Input <- ("
Policecontactstatus   Never   Occasional   Frequent

Troublewithpolice     71      154         398

NoTroublewithpolice   4992    2808        2732

")

Ourdata <- as.matrix(read.table(textConnection(Input),
                                
                                header = TRUE,
                                row.names = 1))

Ourdata

chisq.test(Ourdata)


# Method 3


observed_table <- matrix(c(71,154,398,4992,2808,2732), nrow = 2, ncol = 3, byrow = T)
colnames(observed_table) <- c("Never", "Occasional", "Frequent")
rownames(observed_table) <- c("Troublewithpolice ", "Troublewithpolice ")
              

observed_table

chisq.test(observed_table)

#textbook example

PartyID <- matrix(c(495,590,272,330,498,265), nrow = 2, ncol = 3, byrow = T)
colnames(PartyID) <- c("Democrat", "Independent", "Republican")
rownames(PartyID) <- c("Females", "Males")
PartyID

chisq.test(PartyID)

chisq.test(PartyID) ->  ExpectedValues
ExpectedValues

ExpectedValues$expected


q()
y

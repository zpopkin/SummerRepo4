

volume_cylinder <- function(r, h) {
  pi*r^2*h
}

volume_cylinder(4, 6)
volume_cylinder(3, 10)






QuadFormula <- function(a,b,c){ 
answer1 <- (-b - sqrt(b^2 - (4*a*c)))/(2*a) 
answer2<-  (-b + sqrt(b^2 - (4*a*c)))/(2*a)  
return(c(answer1 = answer1, answer2 = answer2))

}

  QuadFormula(3,17,-6)
  

V = e^3
SA = 6*e^2
DL =e*sqrt(3)


Cube <- function(e) {
  Volume <- e^3
  SA <- 6*e^2
  DL <- e*sqrt(3)
  return(c(Volume = Volume, SA = SA, DL = DL))
}

Cube(10)
Cube(12)
Cube(6)



Cube <- function(e) {
  Volume <- e^3
  SA <- 6*e^2
  DL <- e*sqrt(3)
  return(data.frame(Volume = Volume, SA = SA, DL = DL))
}

Cube(c(10,12,6))




QuadFormula <- function(a,b,c) {
  a^2 + b^2 + c^2
}

QuadFormula(3,17,-6)

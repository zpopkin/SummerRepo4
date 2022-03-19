
library(shiny)
library(ggplot2)
library(tidyverse)

# Iris scatter plots
ui <- fluidPage(
  titlePanel("Iris Scatter Plot"),
  selectInput("var1", "Variable 1", choices = names(iris)),
  selectInput("var2", "Variable 2", choices = names(iris)),
  plotOutput("plot")
)

server <- function(input, output) {
  output$plot <- renderPlot({
    ggplot(iris, aes(x = .data[[input$var1]], y = .data[[input$var2]])) +
      geom_point(color = "red")
  })
}

shinyApp(ui = ui, server = server)

# Iris Boxplots

ui <- fluidPage(
  titlePanel("Iris Box Plots"),
  selectInput("var", "Variables", choices = names(iris)),
  plotOutput("plot")

)

server <- function(input, output) {
  output$plot <- renderPlot({
    ggplot(iris, aes(y = .data[[input$var]])) +
      geom_boxplot(fill = "blue")

      
  })
  
}

shinyApp(ui = ui, server = server)






# Iris histogams

ui <- fluidPage(
  titlePanel("Iris histogram Plots"),
  selectInput("var", "Variables", choices = names(iris)),
  plotOutput("plot"),
  
)

server <- function(input, output) {
    output$plot <- renderPlot({
      ggplot(iris, aes(x = .data[[input$var]])) +
        geom_histogram(fill = "blue") 
  })
}

shinyApp(ui = ui, server = server)


# Column Names for Iris
ui <- fluidPage(
  textOutput("text"),
  verbatimTextOutput("code")
)

server <- function(input, output, session) {
  output("text"),
  output$code <- renderText({
    "Iris Data Set"
  })
  
output$code <- renderPrint({
  summary(c(1,2,3,4,5))
})
 
}

shinyApp(ui = ui, server = server)



library(shiny)

ui <- fluidPage(
  textOutput("text"),
  verbatimTextOutput("code")
)

server <- function(input, output, session) {
  output$text <- renderText({
    "Iris Data Set!"
  })
  
  output$code <- renderPrint({
    summary(iris$Sepal.Length)
    
    
  })
}

shinyApp(ui = ui, server = server)



sports <- c("Football", "Basketball", "Baseball", "Tennis", "Soccer")
ui <- fluidPage(
  titlePanel("Play Ball !"),
  checkboxGroupInput("Favorites", "What are your favorite sports?", 
                     choices = sports)
)

server <- function(input, output) {
  
}

shinyApp(ui = ui, server = server)




runExample("03_reactivity") # a reactive expression


q()
y
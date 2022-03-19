library(tidyverse)
library(ggplot)
library(shiny)

diamonds%>%
  select(carat,price,x,y,z) -> diamonds1
diamonds1

ui <- fluidPage(
  titlePanel("Frequency Plots"),
  selectInput("DVvar", "Diamond Variables", choices = names(diamonds1)),
  plotOutput("plot"),
  
)

server <- function(input, output) {
  output$plot <- renderPlot({
    ggplot(diamonds, mapping = aes(x = .data[[input$DVvar]], color = cut)) +
      geom_freqpoly(binwidth = 0.1) +
      ggtitle("frequency polygons")
     
    
  })
}
shinyApp(ui = ui, server = server)




diamonds%>%
  select(carat,price,x,y,z) -> diamonds1
diamonds1

ui <- fluidPage(
  titlePanel("Frequency Plots"),
  selectInput("DVvar", "Diamond Variables", choices = names(diamonds1)),
  mainPanel(
  plotOutput("plot1"),
  plotOutput("plot2"),
  dataTableOutput("dynamic")
  
  )
)

server <- function(input, output) {
  output$plot1 <- renderPlot({
    ggplot(diamonds, mapping = aes(x = .data[[input$DVvar]], color = cut)) +
      geom_freqpoly(binwidth = 0.1) +
      ggtitle("frequency polygon")
  })
  
  output$plot2 <- renderPlot({
    ggplot(diamonds, mapping = aes(y = .data[[input$DVvar]], x = cut)) +
      geom_boxplot(fill = "purple") +
      ggtitle("boxplot")
  })
  
  output$dynamic <- renderDataTable({
    diamonds1
  }) 

}
shinyApp(ui = ui, server = server)












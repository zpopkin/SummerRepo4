library(shiny)
library(tidyverse)

#  Shiny Example using tabs

ui <- fluidPage(
  headerPanel (title = "Shiny Tabset Example"),
  sidebarLayout(
    sidebarPanel(
      selectInput("vars", "Iris variables", choices = names(iris))
      
    ),
                                                         
    
    mainPanel(
      tabsetPanel(type = "tab" ,
                  tabPanel("Data", tableOutput("iris")),
                  tabPanel("Summary" , verbatimTextOutput("summ")),
                  tabPanel("Plot", plotOutput("plot"))
                  
      )
    )
    
  )
)



library(shiny)

server <- function(input,output) {
  output$iris <- renderTable({
    iris        #[input$ngear]    
    
  })
  
  output$summ <- renderPrint({
    summary(iris)    #[input$ngear])   
    
  })
  
  output$plot <- renderPlot({
    ggplot(iris, aes(x = .data[[input$vars]])) +
      geom_boxplot(fill = "yellow", color = "green")
    
    #boxplot(mpg~input$ngear, data = c(mtcars$cyl,mtcars$am,
    #   mtcars$gear))
  })
}


shinyApp(ui = ui, server = server)





'use client'

import { useState } from "react"


function saveQuiz(name:string){

  console.log("saving quiz:", name)
}

export default function NewQuiz() {
  const [quizName, setQuizName] = useState("")

  return (
    <div className="pt-50 flex justify-center align-items-center h-screen bg-zinc-50 dark:bg-black">
      <div className="align-self-center">
        <h1>New Quiz</h1>
        <input placeholder="New Quiz Name" value={quizName} onChange={(e) => setQuizName(e.target.value)}></input>
        <button onClick={() => saveQuiz(quizName)}>Save</button>

      </div>
    </div>
  )
}

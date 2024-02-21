import { useEffect, useState } from "react"
import supabase from "./supabase"
import "./style.css"

const CATEGORIES = [
  { name: "technology", color: "#3b82f6" },
  { name: "science", color: "#16a34a" },
  { name: "finance", color: "#ef4444" },
  { name: "society", color: "#eab308" },
  { name: "entertainment", color: "#db2777" },
  { name: "health", color: "#14b8a6" },
  { name: "history", color: "#f97316" },
  { name: "news", color: "#8b5cf6" }
]

function isValidHttpUrl(string) {
  let url

  try {
    url = new URL(string)
  } catch (_) {
    return false
  }

  return url.protocol === "http:" || url.protocol === "https:"
}

function App() {
  const [showForm, setShowForm] = useState(false)
  const [facts, setFacts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentCategory, setCurrentCategory] = useState("all")

  useEffect(
    function() {
      async function getFacts() {
        try {
          let query = supabase.from("facts").select("*")

          if (currentCategory !== "all") {
            query = query.eq("category", currentCategory)
          }
          setIsLoading(true)
          const { data: facts, error } = await query.order("votesInteresting", { ascending: false })
          if (!error) {
            setFacts(facts)
            setIsLoading(false)
          } else {
            throw new Error("There was a problem loading fetching data from the database.")
          }
        } catch (error) {
          alert(error.message)
        }
      }
      getFacts()
    },
    [currentCategory]
  )

  return (
    <>
      <Header showForm={showForm} setShowForm={setShowForm} />
      {showForm ? <FactForm setFacts={setFacts} setShowForm={setShowForm} /> : null}

      <main className="main">
        <CategoryFilter setCurrentCategory={setCurrentCategory} />
        {isLoading ? <Loader /> : <FactList facts={facts} setFacts={setFacts} />}
      </main>
    </>
  )
}

function Loader() {
  return <p className="message">Loading...</p>
}

function Header({ showForm, setShowForm }) {
  const appTitle = "Today I Learned"

  return (
    <header className="header">
      <div className="logo">
        <img src="logo.png" alt="Today I learned Logo" />
        <h1>{appTitle}</h1>
      </div>
      <button className="btn btn--large btn--share-fact" onClick={() => setShowForm(!showForm)}>
        {!showForm ? "Share a fact" : "Close"}
      </button>
    </header>
  )
}

function FactForm({ setFacts, setShowForm }) {
  const [text, setText] = useState("")
  const [source, setSource] = useState("")
  const [category, setCategory] = useState("")
  const [isUploading, setIsUploading] = useState(false)

  async function handleSubmit(evt) {
    evt.preventDefault()
    try {
      if (text && text.length <= 200 && isValidHttpUrl(source) && category) {
        setIsUploading(true)
        const fact = { text, source, category }
        const { data: newFact, error } = await supabase
          .from("facts")
          .insert([fact])
          .select()
        setIsUploading(false)

        if (error) throw new Error("Something went wrong.")

        setFacts(facts => [newFact[0], ...facts])
        setText("")
        setSource("")
        setCategory("")
        setShowForm(false)
      }
    } catch (error) {
      alert(error.message)
    }
  }
  return (
    <form className="fact-form" onSubmit={handleSubmit}>
      <input type="text" placeholder="Share a fact with the world..." value={text} onChange={evt => setText(evt.target.value)} disabled={isUploading} />
      <span>{200 - text.length}</span>
      <input type="text" placeholder="Trustworthy source..." value={source} onChange={evt => setSource(evt.target.value)} disabled={isUploading} />
      <select
        value={category}
        onChange={evt => {
          setCategory(evt.target.value)
        }}
        disabled={isUploading}
      >
        <option value="">Choose category:</option>
        {CATEGORIES.map(el => (
          <option value={el.name} key={el.name}>
            {el.name.toUpperCase()}
          </option>
        ))}
      </select>
      <button className="btn btn--large btn--post" disabled={isUploading}>
        {!isUploading ? "Post" : "Posting..."}
      </button>
    </form>
  )
}

function CategoryFilter({ setCurrentCategory }) {
  return (
    <aside>
      <ul className="categories">
        <li>
          <button className="btn btn--all" onClick={() => setCurrentCategory("all")}>
            All
          </button>
        </li>
        {CATEGORIES.map(category => (
          <Category key={category.name} category={category} setCurrentCategory={setCurrentCategory} />
        ))}
      </ul>
    </aside>
  )
}

function Category({ category, setCurrentCategory }) {
  return (
    <li>
      <button className="btn btn--category" style={{ backgroundColor: category.color }} onClick={() => setCurrentCategory(category.name)}>
        {category.name}
      </button>
    </li>
  )
}

function FactList({ facts, setFacts }) {
  // const facts = initialFacts
  if (!facts.length) return <p className="message">There are no facts for this category yet. How about creating the first one? 🤔</p>
  else
    return (
      <section>
        <ul className="facts--list">
          {facts.map(fact => (
            <Fact key={fact.id} fact={fact} setFacts={setFacts} />
          ))}
        </ul>
        <p></p>
      </section>
    )
}

function Fact({ fact, setFacts }) {
  const [isUpdating, setIsUpdating] = useState(false)
  const isDisputed = fact.votesInteresting + fact.votesMindblowing < fact.votesFalse

  async function handleVote(votes) {
    try {
      setIsUpdating(true)
      const { data: updatedFact, error } = await supabase
        .from("facts")
        .update({ [votes]: fact[votes] + 1 })
        .eq("id", fact.id)
        .select()

      if (error) throw new Error("Something went wrong.")
      setFacts(facts => facts.map(el => (el.id === fact.id ? updatedFact[0] : el)))
      setIsUpdating(false)
    } catch (error) {
      alert(error.message)
    }
  }

  return (
    <li className="fact">
      <p>
        {isDisputed ? <span className="disputed">[⛔DISPUTED]</span> : null}
        {fact.text}
        <a className="source" href={fact.source} target="_blank" rel="noreferrer">
          (Source)
        </a>
      </p>
      <span className="tag" style={{ backgroundColor: CATEGORIES.find(cat => cat.name === fact.category).color }}>
        {fact.category}
      </span>
      <div className="vote-buttons">
        <button onClick={() => handleVote("votesInteresting")} disabled={isUpdating}>
          👍<strong>{fact.votesInteresting}</strong>
        </button>
        <button onClick={() => handleVote("votesMindblowing")} disabled={isUpdating}>
          🤯<strong>{fact.votesMindblowing}</strong>
        </button>
        <button onClick={() => handleVote("votesFalse")} disabled={isUpdating}>
          ⛔<strong>{fact.votesFalse}</strong>
        </button>
      </div>
    </li>
  )
}

export default App

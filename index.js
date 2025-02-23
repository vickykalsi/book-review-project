import express from "express";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import favicon from "serve-favicon";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;
const db = new pg.Client({
  user: "postgres",
  password: "1234",
  database: "books",
  host: "localhost",
  port: 5432
});
let books, sortBy = "id", order = "asc";

db.connect();

app.use(express.static("public"));
app.use(favicon(path.join(__dirname, 'public', 'images', 'books.svg')));
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
  try {
    const response = await db.query(`select books.book_id as id,books.title,books.author,reviews.rating,reviews.reviewed_date from books inner join reviews on books.book_id=reviews.book_id order by ${sortBy} ${order}`);
    books = response.rows;
    res.render("home.ejs", { books });
  }
  catch (error) {
    console.error(`unable to fetch data from books join reviews table due to : ${error}`);
  }
})

app.post("/", async (req, res) => {
  sortBy = req.body.sortBy;
  if (sortBy == "rating")
    order = "desc";
  else
    order = "asc";
  res.redirect("/");
})

app.post("/new-book", async (req, res) => {
  try {
    const { title, author, rating, date } = req.body;
    const response = await db.query("insert into books(title,author) values($1,$2) returning book_id", [title, author]);
    await db.query("insert into reviews(book_id,rating,reviewed_date) values($1,$2,$3)", [response.rows[0].book_id, rating, date]);
    sortBy = "id";
    res.redirect("/");
  }
  catch (error) {
    console.error(`unable to insert date in books and reviews tables due to : ${error}`);
  }
})

app.post("/edit-review", async (req, res) => {
  try {
    const response = await db.query("select title,author from books where book_id=$1", [req.body.id]);
    const { title, author } = response.rows[0];
    res.render("edit.ejs", { id: req.body.id, title, author });
  }
  catch (error) {
    console.error(`unable to fetch data from books table due to : ${error}`);
  }
})

app.post("/edit-review-on-DB", async (req, res) => {
  const { rating, id } = req.body;
  try {
    await db.query("update reviews set rating=$1 where book_id=$2", [rating, id]);
    res.redirect("/");
  }
  catch (error) {
    console.error(`unable to update data on reviews table due to : ${error}`);
  }
})

app.post("/delete-review", async (req, res) => {
  try {
    await db.query("delete from reviews where book_id=$1", [req.body.id]);
    await db.query("delete from books where book_id=$1", [req.body.id]);
    res.redirect("/");
  }
  catch (error) {
    console.error(`unable to delete data from reviews and books table due to : ${error}`);
  }
})

app.listen(port, () => {
  console.log(`server is running at port : ${port}`);
})
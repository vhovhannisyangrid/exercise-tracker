const express = require('express')
const app = express()
const cors = require('cors')
const userRoutes = require('./routes/user.route');
app.use(express.urlencoded({ extended: true }));
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use('/api', userRoutes);

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

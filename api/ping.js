module.exports = (req, res) => {
  res.status(200).json({ 
    message: 'pong', 
    timestamp: Date.now(),
    working: true
  });
};
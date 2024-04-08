import axios from 'axios'

const axiosDf = axios.create({
	baseURL: 'http://localhost:5055/',
	withCredentials: true,
})

export default axiosDf

import { supabase } from './supabase'
import { getLocalUser } from './currentUser'
import { isNetworkError } from './network'
import { loadOffline, saveOffline } from './offlineCache'

export async function isCurrentUserAdmin(): Promise<boolean> {
	const {
		data: { user },
		error: userError
	} = await getLocalUser()

	if (userError || !user?.id) return false

	// Sans réseau, la dernière réponse du serveur (A5) : la garde des routes
	// ne fait pas attendre l'app au sous-sol. Elle ne sert qu'à l'affichage ;
	// les règles d'accès de la base décident toujours.
	const key = `admin:${user.id}`
	const saved = loadOffline<boolean>(key)
	const { data, error } = await supabase
		.from('admin_users')
		.select('user_id')
		.eq('user_id', user.id)
		.maybeSingle()
		.retry(saved === null)

	if (error) return saved !== null && isNetworkError(error) ? saved.value : false
	saveOffline(key, Boolean(data))
	return Boolean(data)
}

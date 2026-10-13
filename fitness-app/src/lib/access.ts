import { supabase } from './supabase'
import { getLocalUser } from './currentUser'

export async function isCurrentUserAdmin(): Promise<boolean> {
	const {
		data: { user },
		error: userError
	} = await getLocalUser()

	if (userError || !user?.id) return false

	const { data, error } = await supabase
		.from('admin_users')
		.select('user_id')
		.eq('user_id', user.id)
		.maybeSingle()

	if (error) return false
	return Boolean(data)
}
